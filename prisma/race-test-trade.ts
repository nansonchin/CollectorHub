import "dotenv/config";
import {
  TradeError,
  acceptTrade,
  cancelTrade,
  createTrade,
} from "../src/features/trades/trades.service";
import { prisma } from "../src/lib/prisma";

// 并发实验：同一个交换提议，收件人在点"接受"，发起人同时点"撤回"。
// 预期：恰好一个成功，另一个得到 TRADE_NOT_AVAILABLE，
// 并且不管谁赢，卡牌和 Gold 都不会丢失、不会凭空出现。
//
// 运行方式：npx tsx prisma/race-test-trade.ts 发起人邮箱 收件人邮箱
// 前提：双方各有至少一张"可用"的卡。
// 注意：如果"接受"赢了，这两张卡会真的互换（数据保留；之后可以再发起一次交换换回来）。
// 跑完之后请运行 npx tsx prisma/check-invariants.ts 验证账目。

async function main() {
  const [proposerEmail, recipientEmail] = process.argv.slice(2);
  if (!proposerEmail || !recipientEmail) {
    throw new Error("Usage: npx tsx prisma/race-test-trade.ts <proposer email> <recipient email>");
  }

  const [proposer, recipient] = await Promise.all([
    prisma.user.findUnique({ where: { email: proposerEmail } }),
    prisma.user.findUnique({ where: { email: recipientEmail } }),
  ]);
  if (!proposer || !recipient) throw new Error("Both emails must belong to existing users.");

  const pick = async (userId: string) => {
    const items = await prisma.inventoryItem.findMany({
      where: { userId, quantity: { gt: 0 } },
      include: { card: true },
    });
    return items.find((item) => item.quantity - item.reservedQuantity >= 1);
  };

  const mine = await pick(proposer.id);
  const theirs = await pick(recipient.id);
  if (!mine || !theirs) throw new Error("Both players need at least one available card.");

  console.log(`Trade: ${proposerEmail} gives "${mine.card.name}", wants "${theirs.card.name}" + 10 Gold`);

  const trade = await createTrade(proposer.id, {
    recipientId: recipient.id,
    offerItems: [{ cardId: mine.cardId, quantity: 1 }],
    requestItems: [{ cardId: theirs.cardId, quantity: 1 }],
    offeredGold: 0,
    requestedGold: 10,
    message: undefined,
  });

  console.log("Racing accept (recipient) against cancel (proposer)...");
  const results = await Promise.allSettled([
    acceptTrade(recipient.id, trade.id),
    cancelTrade(proposer.id, trade.id),
  ]);

  const labels = ["accept", "cancel"];
  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      console.log(`  ${labels[index]}: SUCCESS`);
    } else {
      const reason = result.reason;
      console.log(
        `  ${labels[index]}: REJECTED (${reason instanceof TradeError ? reason.code : reason})`,
      );
    }
  });

  const final = await prisma.trade.findUniqueOrThrow({ where: { id: trade.id } });
  console.log(`Final trade status: ${final.status}`);
  console.log("Now run: npx tsx prisma/check-invariants.ts");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });