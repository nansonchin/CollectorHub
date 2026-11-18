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

export async function applyLedger(tx: Tx, input: ApplyLedgeInput) {
  const wallet = await tx.wallet.update({
    where: { userId: input.userId },
    data: { balance: { increment: input.amount } },
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
