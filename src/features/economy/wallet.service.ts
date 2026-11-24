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

export async function lockWallets(tx: Tx, userIds: string[]) {
  const sorted = [...new Set(userIds)].sort();
  await tx.$queryRaw`
    SELECT "userId" FROM "Wallet"
    WHERE "userId" = ANY(${sorted}::text[])
    ORDER BY "userId"
    FOR UPDATE 
  `;
}

export async function freezeGold(tx: Tx, userId: string, amount: number) {
  const { count } = await tx.wallet.updateMany({
    where: { userId, balance: { gte: amount } },
    data: {
      balance: { decrement: amount },
      frozenBalance: { increment: amount },
    },
  });
  if (count === 0) throw new InsufficientFundsError();
}

export async function releaseGold(tx: Tx, userId: string, amount: number) {
  const { count } = await tx.wallet.updateMany({
    where: { userId, frozenBalance: { gte: amount } },
    data: {
      balance: { increment: amount },
      frozenBalance: { decrement: amount },
    },
  });
  if (count === 0)
    throw new Error(`Frozen balance mismatch for user ${userId}`);
}

export async function spendFrozenGold(
  tx: Tx,
  input: {
    userId: string;
    amount: number;
    type: LedgerType;
    refType?: string;
    refId?: string;
  },
) {
  const { count } = await tx.wallet.updateMany({
    where: {
      userId: input.userId,
      frozenBalance: { gte: input.amount },
    },
    data: {
      frozenBalance: { decrement: input.amount },
    },
  });

  if (count === 0) {
    throw new Error(`Frozen balance mismatch for user ${input.userId}`);
  }

   const wallet = await tx.wallet.findUniqueOrThrow({
    where: { userId: input.userId },
    select: { balance: true },
  });

   await tx.ledgerEntry.create({
    data: {
      userId: input.userId,
      amount: -input.amount,
      type: input.type,
      refType: input.refType,
      refId: input.refId,
      balanceAfter: wallet.balance,
    },
  });
}
