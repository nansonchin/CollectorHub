import "dotenv/config";
import {
  QuestError,
  abandonQuest,
  acceptQuest,
} from "../src/features/quests/quests.service";
import { prisma } from "../src/lib/prisma";

// 并发实验：两个玩家在同一瞬间接同一个委托。
// 预期：恰好一个成功，另一个得到 QUEST_NOT_AVAILABLE。
//
// 运行方式：npx tsx prisma/race-test-quest.ts 玩家1邮箱 玩家2邮箱
// 前提：委托板上有一个"开放"的委托，发布人不是这两个人。
// 实验结束后会自动让成功的那个人放弃接单，委托恢复开放。

async function main() {
  const [email1, email2] = process.argv.slice(2);
  if (!email1 || !email2) {
    throw new Error("Usage: npx tsx prisma/race-test-quest.ts <player1 email> <player2 email>");
  }

  const [player1, player2] = await Promise.all([
    prisma.user.findUnique({ where: { email: email1 } }),
    prisma.user.findUnique({ where: { email: email2 } }),
  ]);
  if (!player1 || !player2) throw new Error("Both emails must belong to existing users.");

  const quest = await prisma.quest.findFirst({
    where: {
      status: "OPEN",
      expiresAt: { gt: new Date() },
      creatorId: { notIn: [player1.id, player2.id] },
    },
    include: { card: true },
  });
  if (!quest) throw new Error("Need an OPEN quest created by a third player.");

  console.log(`Racing two acceptances for the quest "${quest.quantity}× ${quest.card.name}"...`);

  const results = await Promise.allSettled([
    acceptQuest(player1.id, quest.id),
    acceptQuest(player2.id, quest.id),
  ]);

  results.forEach((result, index) => {
    const who = index === 0 ? email1 : email2;
    if (result.status === "fulfilled") {
      console.log(`  ${who}: SUCCESS`);
    } else {
      const reason = result.reason;
      console.log(
        `  ${who}: REJECTED (${reason instanceof QuestError ? reason.code : reason})`,
      );
    }
  });

  // 清理：成功的那个人放弃接单，委托恢复开放
  for (const [index, result] of results.entries()) {
    if (result.status === "fulfilled") {
      await abandonQuest((index === 0 ? player1 : player2).id, quest.id);
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