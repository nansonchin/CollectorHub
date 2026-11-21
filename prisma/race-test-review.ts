import "dotenv/config";
import { ReviewError, createReview } from "../src/features/reviews/reviews.service";
import { prisma } from "../src/lib/prisma";

// 并发实验：同一个人对同一笔订单，在同一瞬间提交两次评价。
// 预期：恰好一个成功，另一个得到 ALREADY_REVIEWED。
// 这证明"只能评一次"是由数据库的唯一约束保证的，不是靠"先查有没有评过"。
//
// 运行方式：npx tsx prisma/race-test-review.ts 你的邮箱
// 前提：你至少有一笔还没评价的订单（先在网站上完成一笔买卖，不要评价它）。
// 实验结束后会自动删除这条测试评价，订单恢复成"未评价"。

async function main() {
  const email = process.argv[2];
  if (!email) throw new Error("Usage: npx tsx prisma/race-test-review.ts <email>");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error(`No user with email ${email}`);

  const order = await prisma.order.findFirst({
    where: {
      OR: [{ buyerId: user.id }, { sellerId: user.id }],
      reviews: { none: { reviewerId: user.id } },
    },
    include: { card: true },
  });
  if (!order) throw new Error("Need an order that you have not reviewed yet.");

  console.log(`Racing two reviews for the order of "${order.card.name}" (${order.id})...`);

  const input = { rating: 5, tags: [], comment: undefined } as const;
  const results = await Promise.allSettled([
    createReview(user.id, order.id, { ...input, tags: [] }),
    createReview(user.id, order.id, { ...input, tags: [] }),
  ]);

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      console.log(`  request ${index + 1}: SUCCESS`);
    } else {
      const reason = result.reason;
      console.log(
        `  request ${index + 1}: REJECTED (${reason instanceof ReviewError ? reason.code : reason})`,
      );
    }
  });

  const count = await prisma.review.count({
    where: { orderId: order.id, reviewerId: user.id },
  });
  console.log(`Reviews stored for this order by you: ${count}`);

  await prisma.review.deleteMany({ where: { orderId: order.id, reviewerId: user.id } });
  console.log("Cleaned up.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });