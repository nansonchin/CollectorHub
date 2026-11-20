import "dotenv/config";
import { randomUUID } from "node:crypto";
import {
  PaymentError,
  createPayment,
} from "../src/features/payments/payments.service";
import { prisma } from "../src/lib/prisma";

// 幂等实验：同一次结账（同一个幂等键）的请求，在同一瞬间发出两遍。
// 预期：
//   - 一个请求真正扣款并入账（SUCCEEDED，replayed=false）
//   - 另一个被告知 PAYMENT_IN_PROGRESS（它来得太早，第一个还在处理）
//   - 等第一个处理完，再发第三遍：直接返回上次的结果（replayed=true），不再扣款
//   - 最终 Gold 只增加一次，TOP_UP 流水只有一条
//
// 运行方式：npx tsx prisma/race-test-payment.ts 你的邮箱
// 注意：这个实验会真的给你的账号增加 500 Gold（测试币，没有副作用）。

async function main() {
  const email = process.argv[2];
  if (!email) throw new Error("Usage: npx tsx prisma/race-test-payment.ts <email>");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error(`No user with email ${email}`);

  const readBalance = async () =>
    (await prisma.wallet.findUniqueOrThrow({ where: { userId: user.id } })).balance;

  const input = {
    packId: "pouch",
    testCard: "4242424242424242",
    idempotencyKey: randomUUID(),
  } as const;

  const before = await readBalance();
  console.log(`Balance before: ${before}`);
  console.log(`Sending the same checkout (key ${input.idempotencyKey.slice(0, 8)}…) twice at once...`);

  const results = await Promise.allSettled([
    createPayment(user.id, input),
    createPayment(user.id, input),
  ]);

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      console.log(
        `  request ${index + 1}: ${result.value.payment.status} (replayed=${result.value.replayed})`,
      );
    } else {
      const reason = result.reason;
      console.log(
        `  request ${index + 1}: REJECTED (${reason instanceof PaymentError ? reason.code : reason})`,
      );
    }
  });

  console.log("Sending it a third time, after the first one has finished...");
  const third = await createPayment(user.id, input);
  console.log(
    `  request 3: ${third.payment.status} (replayed=${third.replayed}), payment ${third.payment.id}`,
  );

  const after = await readBalance();
  const topUps = await prisma.ledgerEntry.count({
    where: { type: "TOP_UP", refId: third.payment.id },
  });
  console.log(`Balance after: ${after} (change: +${after - before})`);
  console.log(`TOP_UP ledger entries for this payment: ${topUps}`);
  console.log(
    after - before === 500 && topUps === 1
      ? "OK: charged exactly once."
      : "PROBLEM: the payment was not applied exactly once!",
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });