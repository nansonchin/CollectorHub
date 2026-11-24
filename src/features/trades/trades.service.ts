import { prisma } from "@/src/lib/prisma";
import {
  applyLedger,
  freezeGold,
  InsufficientFundsError,
  lockWallets,
  releaseGold,
  spendFrozenGold,
  Tx,
} from "../economy/wallet.service";
import { CreateTradeInput } from "./trades.schema";
import { MAX_OPEN_TRADES, TRADE_EXPIRY_HOURS } from "./trades.config";
import { giveCopies, lockCopies, lockInventoryRows, takeAvailableCopies, takeLockedCopies, unlockCopies } from "../economy/inventory.service";
import { PrismaClient } from "@/generated/prisma/internal/class";
import { GlobalOmitConfig } from "@/generated/prisma/internal/prismaNamespace";
import { DefaultArgs } from "@prisma/client/runtime/client";

export type TradeErrorCode =
  | "RECIPIENT_NOT_FOUND"
  | "CANNOT_TRADE_WITH_SELF"
  | "INVALID_CARD"
  | "TOO_MANY_OPEN_TRADES"
  | "NOT_ENOUGH_COPIES"
  | "INSUFFICIENT_FUNDS"
  | "TRADE_NOT_FOUND"
  | "TRADE_NOT_AVAILABLE";

export class TradeError extends Error {
  constructor(public readonly code: TradeErrorCode) {
    super(code);
    this.name = "TradeError";
  }
}

type TradeWithItems = {
  id: string;
  proposerId: string;
  offeredGold: number;
  items: { side: "OFFER" | "REQUEST"; cardId: string; quantity: number }[];
};

async function releaseProposerLocks(tx: Tx, trade: TradeWithItems) {
  if (trade.offeredGold > 0) {
    await releaseGold(tx, trade.proposerId, trade.offeredGold);
  }
  const offered = trade.items
    .filter((item) => item.side === "OFFER")
    .sort((a, b) => a.cardId.localeCompare(b.cardId));
  for (const item of offered) {
    await unlockCopies(tx, trade.proposerId, item.cardId, item.quantity);
  }
}

export async function createTrade(proposerId: string, input: CreateTradeInput) {
  const {
    recipientId,
    offerItems,
    requestItems,
    offeredGold,
    requestedGold,
    message,
  } = input;
  if (recipientId === proposerId)
    throw new TradeError("CANNOT_TRADE_WITH_SELF");

  const recipient = await prisma.user.findUnique({
    where: {
      id: recipientId,
    },
    select: { id: true, bannedAt: true },
  });
  if (!recipient || recipient.bannedAt) {
    throw new TradeError("RECIPIENT_NOT_FOUND");
  }
  const cardIds = [
    ...new Set([...offerItems, ...requestItems].map((item) => item.cardId)),
  ];
  const knownCards = await prisma.card.count({
    where: { id: { in: cardIds } },
  });
  if (knownCards != cardIds.length) {
    throw new TradeError("INVALID_CARD");
  }
  const openCount = await prisma.trade.count({
    where: {
      proposerId,
      status: "PENDING",
    },
  });
  if (openCount >= MAX_OPEN_TRADES)
    throw new TradeError("TOO_MANY_OPEN_TRADES");

  return prisma.$transaction(async (tx) => {
    if (offeredGold > 0) {
      try {
        await freezeGold(tx, proposerId, offeredGold);
      } catch (error) {
        if (error instanceof InsufficientFundsError)
          throw new TradeError("INSUFFICIENT_FUNDS");
        throw error;
      }
    }
    // prevent deadlock
    const sorted = [...offerItems].sort((a, b) =>
      a.cardId.localeCompare(b.cardId),
    );
    for (const item of sorted) {
      const locked = await lockCopies(tx, proposerId, item.cardId, item.quantity);
      if (!locked) {
        throw new TradeError("NOT_ENOUGH_COPIES");
      }
    }

    return tx.trade.create({
      data: {
        proposerId,
        recipientId,
        offeredGold,
        requestedGold,
        message: message ?? null,
        expiresAt: new Date(Date.now() + TRADE_EXPIRY_HOURS * 60 * 60 * 1000),
        items: {
          create: [
            ...offerItems.map((item) => ({ side: "OFFER" as const, ...item })),
            ...requestItems.map((item) => ({
              side: "REQUEST" as const,
              ...item,
            })),
          ],
        },
      },
    });
  });
}

export async function acceptTrade(recipientId: string, tradeId: string) {
  return prisma.$transaction(async (tx) => {
    const trade = await tx.trade.findFirst({
      where: { id: tradeId, recipientId },
      include: { items: true },
    });
    if (!trade) {
      throw new TradeError("TRADE_NOT_FOUND");
    }
    await lockWallets(tx, [trade.proposerId, trade.recipientId]);

    const claimed = await tx.trade.updateMany({
      where: { id: tradeId, status: "PENDING", expiresAt: { gt: new Date() } },
      data: { status: "COMPLETED", respondedAt: new Date() },
    });

    if (claimed.count === 0) {
      throw new TradeError("TRADE_NOT_AVAILABLE");
    }

    const ref = { refType: "Trade", refId: trade.id };

    if (trade.offeredGold > 0) {
      await spendFrozenGold(tx, {
        userId: trade.proposerId,
        amount: trade.offeredGold,
        type: "TRADE_GOLD",
        ...ref,
      });

      await applyLedger(tx, {
        userId: trade.recipientId,
        amount: trade.offeredGold,
        type: "TRADE_GOLD",
        ...ref,
      });
    }

    if (trade.requestedGold > 0) {
      try {
        await applyLedger(tx, {
          userId: trade.recipientId,
          amount: -trade.requestedGold,
          type: "TRADE_GOLD",
          ...ref,
        });
      } catch (error) {
        if (error instanceof InsufficientFundsError)
          throw new TradeError("INSUFFICIENT_FUNDS");
        throw error;
      }
      await applyLedger(tx, {
        userId: trade.proposerId,
        amount: trade.requestedGold,
        type: "TRADE_GOLD",
        ...ref,
      });
    }

    const offered = trade.items.filter((item) => item.side === "OFFER");
    const requested = trade.items.filter((item) => item.side === "REQUEST");

    await lockInventoryRows(
      tx,
      [trade.proposerId, trade.recipientId],
      trade.items.map((item) => item.cardId),
    );

    for (const item of offered) {
      const taken = await takeLockedCopies(
        tx,
        trade.proposerId,
        item.cardId,
        item.quantity,
      );
      if (!taken) {
        throw new Error(`Locked cards missing for trade ${trade.id}`);
      }
      await giveCopies(tx, trade.recipientId, item.cardId, item.quantity);
    }

    for (const item of requested) {
      const taken = await takeAvailableCopies(
        tx,
        trade.recipientId,
        item.cardId,
        item.quantity,
      );
      if (!taken) throw new TradeError("NOT_ENOUGH_COPIES");
      await giveCopies(tx, trade.proposerId, item.cardId, item.quantity);
    }

    return { id: trade.id };
  });
}

async function closeTrade(
  tradeId: string,
  who: { role: "proposer" | "recipient"; userId: string },
  newStatus: "REJECTED" | "CANCELLED",
) {
  return prisma.$transaction(async (tx) => {
    const trade = await tx.trade.findFirst({
      where: {
        id: tradeId,
        ...(who.role === "proposer"
          ? { proposerId: who.userId }
          : { recipientId: who.userId }),
      },
      include: { items: true },
    });
    if (!trade) throw new TradeError("TRADE_NOT_FOUND");
    await lockWallets(tx, [trade.proposerId]);

    const { count } = await tx.trade.updateMany({
      where: { id: tradeId, status: "PENDING" },
      data: { status: newStatus, respondedAt: new Date() },
    });
    if (count === 0) throw new TradeError("TRADE_NOT_AVAILABLE");

    await releaseProposerLocks(tx, trade);
    return { id: trade.id };
  });
}

export const cancelTrade = (proposerId: string, tradeId: string) =>
  closeTrade(tradeId, { role: "proposer", userId: proposerId }, "CANCELLED");

export const rejectTrade = (recipientId: string, tradeId: string) =>
  closeTrade(tradeId, { role: "recipient", userId: recipientId }, "REJECTED");

    export async function expireStaleTrades() {
    const stale = await prisma.trade.findMany({
        where: { status: "PENDING", expiresAt: { lte: new Date() } },
        select: { id: true },
        orderBy: { id: "asc" },
    });

    let expired = 0;
    for (const { id } of stale) {
        const done = await prisma.$transaction(async (tx) => {
        const trade = await tx.trade.findUnique({
            where: { id },
            include: {
            items: true,
            },
        });

        if (!trade) {
            return false;
        }

        await lockWallets(tx, [trade.proposerId]);

        const { count } = await tx.trade.updateMany({
            where: { id, status: "PENDING", expiresAt: { lte: new Date() } },
            data: { status: "EXPIRED", respondedAt: new Date() },
        });

        if (count === 0) {
            return false;
        }
        await releaseProposerLocks(tx, trade);
        return true;
        });
        if (done) expired += 1;
    }
    return expired;
    }

export async function tryExpireStaleTime() {
  try {
    await expireStaleTrades();
  } catch (error) {
    console.error("Lazy trade expiry failed:", error);
  }
}

export async function releaseAllTradesForUser(tx: Tx, userId: string) {
  const trades = await tx.trade.findMany({
    where: {
      status: "PENDING",
      OR: [{ proposerId: userId }, { recipientId: userId }],
    },
    include: { items: true },
    orderBy: { id: "asc" },
  });

  if (trades.length === 0) {
    return;
  }

  await lockWallets(
    tx,
    trades.map((trade) => trade.proposerId),
  );

  for (const trade of trades) {
    const { count } = await tx.trade.updateMany({
      where: { id: trade.id, status: "PENDING" },
      data: {
        status: trade.proposerId === userId ? "CANCELLED" : "REJECTED",
        respondedAt: new Date(),
      },
    });
    if (count === 1) await releaseProposerLocks(tx, trade);
  }
}

export async function listMyTrades(userId: string) {
  const trades = await prisma.trade.findMany({
    where: { OR: [{ proposerId: userId }, { recipientId: userId }] },
    include: {
      proposer: { select: { id: true, name: true } },
      recipient: { select: { id: true, name: true } },
      items: { include: { card: { select: { name: true, number: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return {
    incoming: trades.filter(
      (t) => t.status === "PENDING" && t.recipientId === userId,
    ),
    outgoing: trades.filter(
      (t) => t.status === "PENDING" && t.proposerId === userId,
    ),
    history: trades.filter((t) => t.status !== "PENDING").slice(0, 10),
  };
}

export async function countIncomingTrades(userId: string) {
  return prisma.trade.count({
    where: {
      recipientId: userId,
      status: "PENDING",
      expiresAt: { gt: new Date() },
    },
  });
}

export async function getTradeBuilderData(userId: string, otherId: string) {
  if (otherId === userId) {
    return null;
  }

  const other = await prisma.user.findUnique({
    where: { id: otherId },
    select: { id: true, name: true, bannedAt: true },
  });

  if (!other || other.bannedAt) {
    return null;
  }

  const [mine, theirs] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: { userId, quantity: { gt: 0 } },
      include: { card: { select: { id: true, name: true, number: true } } },
      orderBy: { card: { number: "asc" } },
    }),
    prisma.inventoryItem.findMany({
      where: { userId: otherId, quantity: { gt: 0 }, isHidden: false },
      include: { card: { select: { id: true, name: true, number: true } } },
      orderBy: { card: { number: "asc" } },
    }),
  ]);

  const toOption = (item: (typeof mine)[number]) => ({
    cardId: item.card.id,
    name: item.card.name,
    number: item.card.number,
    available: item.quantity - item.reservedQuantity,
  });

  return {
    other: { id: other.id, name: other.name },
    myCards: mine.map(toOption).filter((card) => card.available > 0),
    theirCards: theirs.map(toOption).filter((card) => card.available > 0),
  };
}

