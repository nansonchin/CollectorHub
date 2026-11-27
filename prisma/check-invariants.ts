import "dotenv/config";
import { MAX_GUILD_MEMBERS } from "../src/features/guilds/guilds.config";
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
    // 冻结的 Gold 只是"暂时不能花"，仍然属于这个人，所以恒等式是：可用 + 冻结 = 流水之和
    if (wallet.balance + wallet.frozenBalance !== ledger) {
      problems.push(
        `Wallet ${wallet.userId}: balance ${wallet.balance} + frozen ${wallet.frozenBalance} but ledger sums to ${ledger}`,
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

  // 等待中的交换提议里，发起人拿出来的卡也是被锁住的
  const offeredInTrades = await prisma.tradeItem.findMany({
    where: { side: "OFFER", trade: { status: "PENDING" } },
    select: { cardId: true, quantity: true, trade: { select: { proposerId: true } } },
  });
  for (const item of offeredInTrades) {
    const key = `${item.trade.proposerId}:${item.cardId}`;
    listedByKey.set(key, (listedByKey.get(key) ?? 0) + item.quantity);
  }

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

  // 6. 封号必须彻底：被封的人没有任何登录状态，也没有在售/被保留的挂单、有效的保留。
  const bannedUsers = await prisma.user.findMany({
    where: { bannedAt: { not: null } },
    select: {
      id: true,
      _count: {
        select: {
          sessions: true,
          listings: { where: { status: { in: ["AVAILABLE", "RESERVED"] } } },
          reservations: { where: { status: "ACTIVE" } },
          tradesProposed: { where: { status: "PENDING" } },
          tradesReceived: { where: { status: "PENDING" } },
          questsCreated: { where: { status: { in: ["OPEN", "ACCEPTED"] } } },
          questsAccepted: { where: { status: "ACCEPTED" } },
        },
      },
    },
  });
  for (const user of bannedUsers) {
    const { sessions, listings, reservations, tradesProposed, tradesReceived } = user._count;
    const trades = tradesProposed + tradesReceived;
    const quests = user._count.questsCreated + user._count.questsAccepted;
    if (sessions > 0 || listings > 0 || reservations > 0 || trades > 0 || quests > 0) {
      problems.push(
        `Banned user ${user.id} still has ${sessions} sessions, ${listings} open listings, ${reservations} active reservations, ${trades} pending trades, ${quests} active quests`,
      );
    }
  }

  // 7. 已经处理的举报必须记着是谁处理的；还没处理的不能有处理人。
  const handled = await prisma.report.findMany({
    where: {
      OR: [
        { status: { not: "OPEN" }, handledById: null },
        { status: "OPEN", handledById: { not: null } },
      ],
    },
    select: { id: true, status: true },
  });
  for (const report of handled) {
    problems.push(`Report ${report.id} is ${report.status} but its handler is inconsistent`);
  }

  // 8. 冻结的 Gold 必须和等待中的交换对得上：
  //    每个钱包的 frozenBalance = 他作为发起人的所有 PENDING 交换里 offeredGold 之和。
  const pendingTrades = await prisma.trade.groupBy({
    by: ["proposerId"],
    where: { status: "PENDING" },
    _sum: { offeredGold: true },
  });
  const frozenByUser = new Map(pendingTrades.map((row) => [row.proposerId, row._sum.offeredGold ?? 0]));
  // 进行中的委托（开放或已接单）也会冻结发布人的奖励 Gold
  const openQuests = await prisma.quest.groupBy({
    by: ["creatorId"],
    where: { status: { in: ["OPEN", "ACCEPTED"] } },
    _sum: { rewardGold: true },
  });
  for (const row of openQuests) {
    frozenByUser.set(row.creatorId, (frozenByUser.get(row.creatorId) ?? 0) + (row._sum.rewardGold ?? 0));
  }
  for (const wallet of wallets) {
    const expected = frozenByUser.get(wallet.userId) ?? 0;
    if (wallet.frozenBalance !== expected) {
      problems.push(
        `Wallet ${wallet.userId}: frozenBalance ${wallet.frozenBalance} but open trades and quests lock ${expected}`,
      );
    }
  }

  // 9. 委托必须自洽：
  //    已接单（ACCEPTED）的必须有接单人和独占期限；开放（OPEN）的不能有接单人；
  //    已完成（COMPLETED）的恰好有两条 QUEST_REWARD 流水（发布人付出、接单人收到），
  //    其他状态一条都不能有。这条验证了"奖励只会发放一次"。
  const [quests, rewardEntries] = await Promise.all([
    prisma.quest.findMany({
      select: { id: true, status: true, accepterId: true, acceptExpiresAt: true },
    }),
    prisma.ledgerEntry.groupBy({
      by: ["refId"],
      where: { type: "QUEST_REWARD" },
      _count: { _all: true },
    }),
  ]);
  const rewardCountByQuest = new Map(rewardEntries.map((row) => [row.refId, row._count._all]));
  for (const quest of quests) {
    if (quest.status === "ACCEPTED" && (!quest.accepterId || !quest.acceptExpiresAt)) {
      problems.push(`Quest ${quest.id} is ACCEPTED but has no accepter or deadline`);
    }
    if (quest.status === "OPEN" && (quest.accepterId || quest.acceptExpiresAt)) {
      problems.push(`Quest ${quest.id} is OPEN but still has an accepter`);
    }
    const expected = quest.status === "COMPLETED" ? 2 : 0;
    const actual = rewardCountByQuest.get(quest.id) ?? 0;
    if (actual !== expected) {
      problems.push(
        `Quest ${quest.id} is ${quest.status} but has ${actual} QUEST_REWARD ledger entries (expected ${expected})`,
      );
    }
  }

  // 10. 私聊对话的结构必须正确：
  //     每个 DIRECT 对话恰好有两个成员，directKey 正好是这两个成员 id（排序后）拼成的；
  //     未读数不能是负数。
  //     （未读数是否和消息对得上，没有放进这里：消息正在发送的瞬间，计数器和时间戳会有极短暂的
  //      不一致，检查它会产生误报。）
  const conversations = await prisma.conversation.findMany({
    where: { type: "DIRECT" },
    select: {
      id: true,
      directKey: true,
      members: { select: { userId: true, unreadCount: true } },
    },
  });
  for (const conversation of conversations) {
    const ids = conversation.members.map((member) => member.userId).sort();
    if (ids.length !== 2) {
      problems.push(`Conversation ${conversation.id} has ${ids.length} members (expected 2)`);
    } else if (conversation.directKey !== `${ids[0]}:${ids[1]}`) {
      problems.push(`Conversation ${conversation.id}: directKey does not match its members`);
    }
    if (conversation.members.some((member) => member.unreadCount < 0)) {
      problems.push(`Conversation ${conversation.id} has a negative unread count`);
    }
  }

  // 11. 公会必须结构正确：
  //     每个公会恰好有一个会长；人数不超过上限；被封号的人不能还在任何公会里。
  //     （"一个人只能在一个公会"由数据库的唯一约束保证，不需要在这里检查。）
  const guilds = await prisma.guild.findMany({
    select: {
      id: true,
      name: true,
      members: { select: { role: true, user: { select: { bannedAt: true } } } },
    },
  });
  for (const guild of guilds) {
    const owners = guild.members.filter((member) => member.role === "OWNER").length;
    if (owners !== 1) {
      problems.push(`Guild "${guild.name}" has ${owners} owners (expected exactly 1)`);
    }
    if (guild.members.length > MAX_GUILD_MEMBERS) {
      problems.push(`Guild "${guild.name}" has ${guild.members.length} members (max ${MAX_GUILD_MEMBERS})`);
    }
    if (guild.members.some((member) => member.user.bannedAt !== null)) {
      problems.push(`Guild "${guild.name}" still has a banned member`);
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