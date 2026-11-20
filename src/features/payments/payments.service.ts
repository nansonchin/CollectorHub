import { prisma } from "@/src/lib/prisma";
import { fakeProvider } from "./fake-provider";
import { ChargeResult, PaymentProvider } from "./payment-provider";
import { CreatePaymentInput } from "./payments.schema";
import { GOLD_PACKS, PENDING_TIMEOUT_MS } from "./payments.config";
import { loadWalletBalance } from "../economy/economy.service";
import { randomUUID } from "crypto";
import { applyLedger } from "../economy/wallet.service";

const paymentProvider: PaymentProvider = fakeProvider;

export type PaymentErrorCode = "PAYMENT_IN_PROGRESS" | "IDEMPOTENCY_KEY_REUSED";

export class PaymentError extends Error {
  constructor(public readonly code: PaymentErrorCode) {
    super(code);
    this.name = "PaymentError";
  }
}

async function readBalance(userId: string) {
  const wallet = await prisma.wallet.findUnique({
    where: { userId },
    select: { balance: true },
  });
  return wallet?.balance ?? null;
}

async function markFailed(paymentId: string, reason: string) {
  await prisma.payment.updateMany({
    where: { id: paymentId, status: "PENDING" },
    data: { status: "FAILED", failureReason: reason },
  });
  return prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
}

export async function createPayment(userId: string, input: CreatePaymentInput) {
  const pack = GOLD_PACKS[input.packId];

  await loadWalletBalance(userId);

  const { count } = await prisma.payment.createMany({
    data: [
      {
        id: randomUUID(),
        userId,
        idempotencyKey: input.idempotencyKey,
        packId: input.packId,
        gold: pack.gold,
        amountCents: pack.priceCents,
      },
    ],
    skipDuplicates: true,
  });

  const payment = await prisma.payment.findUniqueOrThrow({
    where: {
      userId_idempotencyKey: { userId, idempotencyKey: input.idempotencyKey },
    },
  });

  if (count === 0) {
    if (payment.packId !== input.packId) {
      throw new PaymentError("IDEMPOTENCY_KEY_REUSED");
    }
    if (payment.status === "PENDING") {
      const age = Date.now() - payment.createdAt.getTime();
      if (age < PENDING_TIMEOUT_MS) {
        throw new PaymentError("PAYMENT_IN_PROGRESS");
      }
      const failed = await markFailed(payment.id, "The payment timed out.");

      return { payment: failed, replayed: true, balance: null };
    }
    return { payment, replayed: true, balance: await readBalance(userId) };
  }
  //   phase 2

  let result: ChargeResult;
  try {
    result = await paymentProvider.charge({
      testCard: input.testCard,
      amountCents: pack.priceCents,
      reference: payment.id,
    });
  } catch (error) {
    console.error(`Payment provider error for payment ${payment.id}:`, error);
    const failed = await markFailed(
      payment.id,
      "The payment provider is unavailable.",
    );
    return { payment: failed, replayed: false, balance: null };
  }

  if (!result.ok) {
    const failed = await markFailed(payment.id, result.reason);
    return { payment: failed, replayed: false, balance: null };
  }

  // phase 3
  const { transactionId } = result;

  const finalized = await prisma.$transaction(async (tx) => {
    const { count: updated } = await tx.payment.updateMany({
      where: { id: payment.id, status: "PENDING" },
      data: { status: "SUCCEEDED", providerTransactionId: transactionId },
    });
    if (updated === 0) return null;

    await applyLedger(tx, {
      userId,
      amount: pack.gold,
      type: "TOP_UP",
      refType: "Payment",
      refId: payment.id,
    });

    return tx.payment.findUniqueOrThrow({ where: { id: payment.id } });
  });
  const current =
    finalized ??
    (await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } }));

  return {
    payment: current,
    replayed: false,
    balance: await readBalance(userId),
  };
}

export async function listRecentPayments(userId: string, take = 5) {
  return prisma.payment.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
  });
}
