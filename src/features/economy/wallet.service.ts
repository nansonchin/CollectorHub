import { Prisma } from "@/generated/prisma/client";

export type Tx = Prisma.TransactionClient;

type LedgerType = Prisma.LedgerEntryUncheckedCreateInput["type"];

type ApplyLedgeInput = {
  userId: string;
  amount: number;
  type: LedgerType;
  refType?: string;
  refId?: string;
};

export class InsufficientFundsError extends Error {
  constructor() {
    super("INSUFFICIENT_FUNDS");
    this.name = "InsufficientFundsError";
  }
}

export async function applyLedger(tx: Tx, input: ApplyLedgeInput) {
  const { userId, amount } = input;

  if (!Number.isInteger(amount) || amount === 0) {
    throw new Error(`Invalid ledger amount: ${amount}`);
  }

  const { count } = await tx.wallet.updateMany({
    where: amount < 0 ? { userId, balance: { gte: -amount } } : { userId },
    data: { balance: { increment: amount } },
  });

  if (count === 0) {
    if (amount < 0) throw new InsufficientFundsError();
    throw new Error(`Wallet not found for user ${userId}`);
  }

 const wallet = await tx.wallet.findUniqueOrThrow({
    where: { userId },
    select: { balance: true },
  });

  await tx.ledgerEntry.create({
    data: {
      userId: input.userId,
      amount: input.amount,
      type: input.type,
      refType: input.refType,
      refId: input.refId,
      balanceAfter: wallet.balance,
    },
  });

  return wallet.balance;
}
