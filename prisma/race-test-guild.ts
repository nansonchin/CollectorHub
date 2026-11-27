import "dotenv/config";
import { GuildError, createGuild, disbandGuild } from "../src/features/guilds/guilds.service";
import { prisma } from "../src/lib/prisma";

// 并发实验：两个玩家在同一瞬间用【同一个名字】创建公会。
// 预期：
//   - 恰好一个成功（扣 500 Gold，成为会长）
//   - 另一个得到 NAME_TAKEN，并且【Gold 一分没少】：
//     因为"付费"和"建公会"在同一个事务里，建公会失败，付费也跟着撤销了，
//     没有写任何"退款"的代码。
//
// 运行方式：npx tsx prisma/race-test-guild.ts 玩家1邮箱 玩家2邮箱
// 前提：两个人都没有公会，各有至少 500 Gold。
// 实验结束后会解散成功创建的那个公会（但那 500 Gold 不退，就是创建费）。

async function main() {
  const [email1, email2] = process.argv.slice(2);
  if (!email1 || !email2) {
    throw new Error("Usage: npx tsx prisma/race-test-guild.ts <player1 email> <player2 email>");
  }

  const [p1, p2] = await Promise.all([
    prisma.user.findUnique({ where: { email: email1 } }),
    prisma.user.findUnique({ where: { email: email2 } }),
  ]);
  if (!p1 || !p2) throw new Error("Both emails must belong to existing users.");

  const balance = async (userId: string) =>
    (await prisma.wallet.findUniqueOrThrow({ where: { userId } })).balance;

  const before = [await balance(p1.id), await balance(p2.id)];
  console.log(`Balances before: ${email1}=${before[0]}, ${email2}=${before[1]}`);
  console.log('Both players create a guild named "Race Test Guild" at the same moment...');

  const input = { name: "Race Test Guild", description: undefined };
  const results = await Promise.allSettled([createGuild(p1.id, input), createGuild(p2.id, input)]);

  results.forEach((result, index) => {
    const who = index === 0 ? email1 : email2;
    if (result.status === "fulfilled") {
      console.log(`  ${who}: SUCCESS (guild ${result.value.id})`);
    } else {
      const reason = result.reason;
      console.log(`  ${who}: REJECTED (${reason instanceof GuildError ? reason.code : reason})`);
    }
  });

  const after = [await balance(p1.id), await balance(p2.id)];
  console.log(`Balances after:  ${email1}=${after[0]}, ${email2}=${after[1]}`);
  console.log(`Gold change:     ${email1}=${after[0] - before[0]}, ${email2}=${after[1] - before[1]}`);
  console.log("Expected: one player lost 500 Gold, the other lost nothing.");

  // 清理：解散成功创建的公会
  for (const [index, result] of results.entries()) {
    if (result.status === "fulfilled") {
      await disbandGuild((index === 0 ? p1 : p2).id, result.value.id);
    }
  }
  console.log("Cleaned up (the winning guild was disbanded).");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });