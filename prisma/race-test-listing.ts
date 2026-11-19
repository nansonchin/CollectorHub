import "dotenv/config";
import {
  MarketError,
  cancelListing,
  createListing,
} from "../src/features/market/market.service";
import { prisma } from "../src/lib/prisma";

// 并发实验：同一张只剩 1 张可用的卡，同时发出两个"挂单"请求。
// 预期：恰好一个成功，另一个得到 NOT_ENOUGH_COPIES。
// 这证明"检查 + 锁定"放在一条 UPDATE 里是安全的。
//
// 运行方式：npx tsx prisma/race-test-listing.ts 你的邮箱
// 实验结束后会自动取消成功的那个挂单，数据恢复原状。

async function main() {
  const email = process.argv[2];
  if (!email) throw new Error("Usage: npx tsx prisma/race-test-listing.ts <email>");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error(`No user with email ${email}`);

  const items = await prisma.inventoryItem.findMany({
    where: { userId: user.id },
    include: { card: true },
  });
  const target = items.find((item) => item.quantity - item.reservedQuantity === 1);
  if (!target) {
    throw new Error("Need a card with exactly 1 available copy (quantity - listed = 1).");
  }

  console.log(`Racing two listings for "${target.card.name}" (1 available)...`);

  const input = { cardId: target.cardId, quantity: 1, unitPrice: 10 };
  const results = await Promise.allSettled([
    createListing(user.id, input),
    createListing(user.id, input),
  ]);

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      console.log(`  request ${index + 1}: SUCCESS (listing ${result.value.id})`);
    } else {
      const reason = result.reason;
      console.log(
        `  request ${index + 1}: REJECTED (${reason instanceof MarketError ? reason.code : reason})`,
      );
    }
  });

  const after = await prisma.inventoryItem.findUniqueOrThrow({
    where: { userId_cardId: { userId: user.id, cardId: target.cardId } },
  });
  console.log(`Locked now: ${after.reservedQuantity} of ${after.quantity}`);

  // 清理：取消成功的挂单，释放锁
  for (const result of results) {
    if (result.status === "fulfilled") await cancelListing(user.id, result.value.id);
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