import "dotenv/config";
import {
  ModerationError,
  resolveReport,
} from "../src/features/moderation/moderation.service";
import { prisma } from "../src/lib/prisma";

// 并发实验：同一个举报，被同一个版主在同一瞬间"驳回"两次
// （现实中更常见的是两个版主同时打开了同一个举报）。
// 预期：恰好一个成功，另一个得到 REPORT_ALREADY_HANDLED。
//
// 运行方式：npx tsx prisma/race-test-resolve.ts 版主或管理员的邮箱
// 前提：队列里有至少一个 OPEN 的举报。
// 注意：成功的那一次会真的把这个举报标记为已驳回（并写入审计日志）。

async function main() {
  const email = process.argv[2];
  if (!email) throw new Error("Usage: npx tsx prisma/race-test-resolve.ts <staff email>");

  const actor = await prisma.user.findUnique({ where: { email } });
  if (!actor || actor.role === "PLAYER") {
    throw new Error("The email must belong to a MODERATOR or ADMIN.");
  }

  const report = await prisma.report.findFirst({ where: { status: "OPEN" } });
  if (!report) throw new Error("No OPEN report in the queue.");

  console.log(`Racing two "dismiss" actions on report ${report.id}...`);

  const input = { action: "DISMISS", note: "race test", message: undefined } as const;
  const results = await Promise.allSettled([
    resolveReport({ id: actor.id, role: actor.role }, report.id, input),
    resolveReport({ id: actor.id, role: actor.role }, report.id, input),
  ]);

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      console.log(`  request ${index + 1}: SUCCESS`);
    } else {
      const reason = result.reason;
      console.log(
        `  request ${index + 1}: REJECTED (${reason instanceof ModerationError ? reason.code : reason})`,
      );
    }
  });

  const logged = await prisma.adminAction.count({ where: { reportId: report.id } });
  console.log(`Audit log entries for this report: ${logged}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });