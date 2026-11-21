import "dotenv/config";
import { prisma } from "../src/lib/prisma";

// 数据"不变量"检查：不管用户怎么操作，这些等式永远应该成立。
// 哪天不成立了，就说明某段代码有 bug。
//
//   1. 每个钱包：balance == 该用户所有流水之和
//   2. 每个仓库行：reservedQuantity == 该卖家、该卡所有"在售/被保留"挂单的数量之和
//   3. 没有出现负数（数据库的 CHECK 约束也在保护，这里再确认一次）
//
// 运行方式：npx tsx prisma/check-invariants.ts
// 建议每做完一个涉及钱和卡的功能，都跑一次。

async function main() {
  const problems: string[] = [];

  // 1. 钱包 vs 流水
  const [wallets, sums] = await Promise.all([
    prisma.wallet.findMany(),
    prisma.ledgerEntry.groupBy({ by: ["userId"], _sum: { amount: true } }),
  ]);
  const ledgerByUser = new Map(sums.map((row) => [row.userId, row._sum.amount ?? 0]));

  for (const wallet of wallets) {
    const ledger = ledgerByUser.get(wallet.userId) ?? 0;
    if (wallet.balance !== ledger) {
      problems.push(
        `Wallet ${wallet.userId}: balance ${wallet.balance} but ledger sums to ${ledger}`,
      );
    }
    if (wallet.balance < 0 || wallet.frozenBalance < 0) {
      problems.push(`Wallet ${wallet.userId}: negative balance`);
    }
  }

  // 2. 仓库的"被锁数量" vs 挂单
  const [inventory, openListings] = await Promise.all([
    prisma.inventoryItem.findMany(),
    prisma.listing.groupBy({
      by: ["sellerId", "cardId"],
      where: { status: { in: ["AVAILABLE", "RESERVED"] } },
      _sum: { quantity: true },
    }),
  ]);
  const listedByKey = new Map(
    openListings.map((row) => [`${row.sellerId}:${row.cardId}`, row._sum.quantity ?? 0]),
  );

  for (const item of inventory) {
    const listed = listedByKey.get(`${item.userId}:${item.cardId}`) ?? 0;
    if (item.reservedQuantity !== listed) {
      problems.push(
        `Inventory ${item.userId}/${item.cardId}: reservedQuantity ${item.reservedQuantity} but open listings total ${listed}`,
      );
    }
    if (item.quantity < 0 || item.reservedQuantity > item.quantity) {
      problems.push(`Inventory ${item.userId}/${item.cardId}: impossible quantities`);
    }
  }

  // 有挂单，却找不到对应的仓库行
  const inventoryKeys = new Set(inventory.map((item) => `${item.userId}:${item.cardId}`));
  for (const key of listedByKey.keys()) {
    if (!inventoryKeys.has(key)) problems.push(`Open listing without inventory row: ${key}`);
  }

  // 3. 保留和挂单的状态必须一一对应：
  //    每个 RESERVED 的挂单恰好有一条 ACTIVE 的保留；
  //    每条 ACTIVE 的保留，它的挂单一定是 RESERVED。
  //    （超时但还没被清理的保留仍然是 ACTIVE + RESERVED，这是合法的中间状态。）
  const [reservedListings, orphanReservations] = await Promise.all([
    prisma.listing.findMany({
      where: { status: "RESERVED" },
      select: { id: true, reservations: { where: { status: "ACTIVE" }, select: { id: true } } },
    }),
    prisma.reservation.findMany({
      where: { status: "ACTIVE", listing: { status: { not: "RESERVED" } } },
      select: { id: true, listingId: true },
    }),
  ]);
  for (const listing of reservedListings) {
    if (listing.reservations.length !== 1) {
      problems.push(
        `Listing ${listing.id} is RESERVED but has ${listing.reservations.length} active reservations`,
      );
    }
  }
  for (const reservation of orphanReservations) {
    problems.push(
      `Reservation ${reservation.id} is ACTIVE but listing ${reservation.listingId} is not RESERVED`,
    );
  }

  // 4. 付款和流水必须一一对应：
  //    每笔 SUCCEEDED 的付款恰好有一条 TOP_UP 流水（refId 是付款 id）；
  //    没成功的付款（PENDING / FAILED）一条都不能有。
  //    这条验证了"幂等"：同一次结账无论请求发了几遍，Gold 只入账一次。
  const [payments, topUps] = await Promise.all([
    prisma.payment.findMany({ select: { id: true, status: true } }),
    prisma.ledgerEntry.findMany({ where: { type: "TOP_UP" }, select: { refId: true } }),
  ]);
  const topUpCount = new Map<string, number>();
  for (const entry of topUps) {
    if (entry.refId) topUpCount.set(entry.refId, (topUpCount.get(entry.refId) ?? 0) + 1);
  }
  for (const payment of payments) {
    const expected = payment.status === "SUCCEEDED" ? 1 : 0;
    const actual = topUpCount.get(payment.id) ?? 0;
    if (actual !== expected) {
      problems.push(
        `Payment ${payment.id} is ${payment.status} but has ${actual} TOP_UP ledger entries (expected ${expected})`,
      );
    }
  }

  // 5. 评价必须合理：
  //    评价者和被评的人恰好是那笔订单的买家和卖家（一个评另一个），不能是同一个人；
  //    分数在 1 到 5 之间。
  //    （同一个人对同一订单只能评一次，由数据库的唯一约束保证。）
  const reviews = await prisma.review.findMany({
    select: {
      id: true,
      rating: true,
      reviewerId: true,
      targetId: true,
      order: { select: { buyerId: true, sellerId: true } },
    },
  });
  for (const review of reviews) {
    const { buyerId, sellerId } = review.order;
    const validPair =
      (review.reviewerId === buyerId && review.targetId === sellerId) ||
      (review.reviewerId === sellerId && review.targetId === buyerId);
    if (!validPair) problems.push(`Review ${review.id}: reviewer/target do not match its order`);
    if (review.rating < 1 || review.rating > 5) {
      problems.push(`Review ${review.id}: rating ${review.rating} out of range`);
    }
  }

  console.log(
    `Checked ${wallets.length} wallets, ${inventory.length} inventory rows, ${openListings.length} open listing groups.`,
  );

  if (problems.length === 0) {
    console.log("All invariants hold.");
  } else {
    console.log(`${problems.length} problem(s):`);
    for (const problem of problems) console.log(`  - ${problem}`);
    process.exitCode = 1;
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });