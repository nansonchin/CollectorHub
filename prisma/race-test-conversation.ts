import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { getOrCreateDirectConversation } from "@/src/features/messages/message.service";

// 并发实验：两个玩家在同一瞬间互相点"发消息"（而且各点了好几次）。
// 预期：不管多少个请求、从哪一方发起，最终只有【一个】对话，并且恰好有两个成员。
// 这证明"每一对玩家只有一个私聊"是由数据库的唯一约束保证的。
//
// 运行方式：npx tsx prisma/race-test-conversation.ts 玩家1邮箱 玩家2邮箱
// 注意：这个脚本会创建（或复用）这两个人之间的对话；对话里没有消息时不会出现在对话列表里。

async function main() {
  const [email1, email2] = process.argv.slice(2);
  if (!email1 || !email2) {
    throw new Error("Usage: npx tsx prisma/race-test-conversation.ts <email 1> <email 2>");
  }

  const [a, b] = await Promise.all([
    prisma.user.findUnique({ where: { email: email1 } }),
    prisma.user.findUnique({ where: { email: email2 } }),
  ]);
  if (!a || !b) throw new Error("Both emails must belong to existing users.");

  console.log("Sending 6 concurrent 'start a conversation' requests (3 from each side)...");

  const results = await Promise.all([
    getOrCreateDirectConversation(a.id, b.id),
    getOrCreateDirectConversation(b.id, a.id),
    getOrCreateDirectConversation(a.id, b.id),
    getOrCreateDirectConversation(b.id, a.id),
    getOrCreateDirectConversation(a.id, b.id),
    getOrCreateDirectConversation(b.id, a.id),
  ]);

  const distinct = new Set(results);
  console.log(`  distinct conversation ids returned: ${distinct.size}`);

  const [low, high] = [a.id, b.id].sort();
  const stored = await prisma.conversation.findMany({
    where: { directKey: `${low}:${high}` },
    include: { members: true },
  });
  console.log(`  conversations stored for this pair: ${stored.length}`);
  console.log(`  members in it: ${stored[0]?.members.length ?? 0}`);

  console.log(
    distinct.size === 1 && stored.length === 1 && stored[0].members.length === 2
      ? "OK: exactly one conversation with two members."
      : "PROBLEM: duplicate conversations or missing members!",
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });