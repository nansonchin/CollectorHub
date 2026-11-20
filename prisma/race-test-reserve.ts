import "dotenv/config";
import {
  MarketError,
  cancelReservation,
  reserveListing,
} from "../src/features/market/market.service";
import { prisma } from "../src/lib/prisma";

// 并发实验：两个买家在同一瞬间保留同一个挂单。
// 预期：恰好一个成功，另一个得到 LISTING_RESERVED。
//
// 运行方式：npx tsx prisma/race-test-reserve.ts 买家1邮箱 买家2邮箱
// 前提：市场上有一个"在售"（AVAILABLE）、且卖家不是这两个人的挂单。
// 实验结束后会自动取消成功的那条保留，数据恢复原状。

async function main() {
  const [email1, email2] = process.argv.slice(2);
  if (!email1 || !email2) {
    throw new Error("Usage: npx tsx prisma/race-test-reserve.ts <buyer1 email> <buyer2 email>");
  }

  const [buyer1, buyer2] = await Promise.all([
    prisma.user.findUnique({ where: { email: email1 } }),
    prisma.user.findUnique({ where: { email: email2 } }),
  ]);
  if (!buyer1 || !buyer2) throw new Error("Both emails must belong to existing users.");

  const listing = await prisma.listing.findFirst({
    where: {
      status: "AVAILABLE",
      sellerId: { notIn: [buyer1.id, buyer2.id] },
    },
    include: { card: true },
  });
  if (!listing) {
    throw new Error("Need an AVAILABLE listing from a third user (neither buyer is the seller).");
  }

  console.log(`Racing two reservations for "${listing.card.name}" (listing ${listing.id})...`);

  const results = await Promise.allSettled([
    reserveListing(buyer1.id, listing.id),
    reserveListing(buyer2.id, listing.id),
  ]);

  results.forEach((result, index) => {
    const who = index === 0 ? email1 : email2;
    if (result.status === "fulfilled") {
      console.log(`  ${who}: SUCCESS (reservation ${result.value.id})`);
    } else {
      const reason = result.reason;
      console.log(
        `  ${who}: REJECTED (${reason instanceof MarketError ? reason.code : reason})`,
      );
    }
  });

  // 清理：取消成功的那条保留，挂单恢复 AVAILABLE
  for (const [index, result] of results.entries()) {
    if (result.status === "fulfilled") {
      const owner = index === 0 ? buyer1 : buyer2;
      await cancelReservation(owner.id, result.value.id);
    }
  }
  console.log("Cleaned up.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });