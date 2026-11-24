import { prisma } from "@/src/lib/prisma";
import { CreateQuestInput } from "./quests.schema";
import {
  ACCEPT_HOLD_HOURS,
  MAX_ACTIVE_ACCEPTED,
  MAX_OPEN_QUESTS,
  QUEST_EXPIRY_DAYS,
} from "./quests.config";
import {
  applyLedger,
  freezeGold,
  InsufficientFundsError,
  lockWallets,
  releaseGold,
  spendFrozenGold,
  Tx,
} from "../economy/wallet.service";
import {
  giveCopies,
  lockInventoryRows,
  takeAvailableCopies,
} from "../economy/inventory.service";
import { ListCardsQuery } from "../cards/cards.schema";
import { buildCardWhere } from "../cards/cards.service";

export type QuestErrorCode =
  | "INVALID_CARD"
  | "TOO_MANY_OPEN_QUESTS"
  | "TOO_MANY_ACCEPTED"
  | "INSUFFICIENT_FUNDS"
  | "NOT_ENOUGH_COPIES"
  | "QUEST_NOT_FOUND"
  | "QUEST_NOT_AVAILABLE"
  | "CANNOT_ACCEPT_OWN";

export class QuestError extends Error {
  constructor(public readonly code: QuestErrorCode) {
    super(code);
    this.name = "QuestError";
  }
}

const HOUR = 60 * 60 * 1000;

const REOPEN_DATA = {
  status: "OPEN" as const,
  accepterId: null,
  acceptedAt: null,
  acceptExpiresAt: null,
};

export async function createQuest(creatorId: string, input: CreateQuestInput) {
  const { cardId, quantity, rewardGold } = input;

  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: { id: true },
  });
  if (!card) throw new QuestError("INVALID_CARD");

  const openCount = await prisma.quest.count({
    where: { creatorId, status: { in: ["OPEN", "ACCEPTED"] } },
  });
  if (openCount >= MAX_OPEN_QUESTS)
    throw new QuestError("TOO_MANY_OPEN_QUESTS");

  return prisma.$transaction(async (tx) => {
    try {
      await freezeGold(tx, creatorId, rewardGold);
    } catch (error) {
      if (error instanceof InsufficientFundsError)
        throw new QuestError("INSUFFICIENT_FUNDS");
      throw error;
    }

    return tx.quest.create({
      data: {
        creatorId,
        cardId,
        quantity,
        rewardGold,
        expiresAt: new Date(Date.now() + QUEST_EXPIRY_DAYS * 24 * HOUR),
      },
    });
  });
}

export async function cancelQuest(creatorId: string, questId: string) {
  return prisma.$transaction(async (tx) => {
    const quest = await tx.quest.findFirst({
      where: { id: questId, creatorId },
    });
    if (!quest) throw new QuestError("QUEST_NOT_FOUND");

    await lockWallets(tx, [creatorId]);

    const { count } = await tx.quest.updateMany({
      where: { id: questId, status: "OPEN" },
      data: { status: "CANCELLED" },
    });
    if (count === 0) throw new QuestError("QUEST_NOT_AVAILABLE");

    await releaseGold(tx, creatorId, quest.rewardGold);
    return { id: quest.id };
  });
}

export async function acceptQuest(accepterId: string, questId: string) {
  return prisma.$transaction(async (tx) => {
    const quest = await tx.quest.findUnique({ where: { id: questId } });
    if (!quest) throw new QuestError("QUEST_NOT_FOUND");
    if (quest.creatorId === accepterId)
      throw new QuestError("CANNOT_ACCEPT_OWN");

    await tx.quest.updateMany({
      where: {
        id: questId,
        status: "ACCEPTED",
        acceptExpiresAt: { lte: new Date() },
      },
      data: REOPEN_DATA,
    });

    const active = await tx.quest.count({
      where: { accepterId, status: "ACCEPTED" },
    });
    if (active >= MAX_ACTIVE_ACCEPTED)
      throw new QuestError("TOO_MANY_ACCEPTED");

    const now = new Date();
    const { count } = await tx.quest.updateMany({
      where: {
        id: questId,
        status: "OPEN",
        expiresAt: { gt: now },
        creatorId: { not: accepterId },
      },
      data: {
        status: "ACCEPTED",
        accepterId,
        acceptedAt: now,
        acceptExpiresAt: new Date(now.getTime() + ACCEPT_HOLD_HOURS * HOUR),
      },
    });
    if (count === 0) throw new QuestError("QUEST_NOT_AVAILABLE");

    return { id: questId };
  });
}

export async function abandonQuest(accepterId: string, questId: string) {
  const { count } = await prisma.quest.updateMany({
    where: { id: questId, accepterId, status: "ACCEPTED" },
    data: REOPEN_DATA,
  });
  if (count === 0) throw new QuestError("QUEST_NOT_AVAILABLE");
  return { id: questId };
}

export async function deliverQuest(accepterId: string, questId: string) {
  return prisma.$transaction(async (tx) => {
    const quest = await tx.quest.findFirst({
      where: { id: questId, accepterId },
    });
    if (!quest) throw new QuestError("QUEST_NOT_FOUND");

    await lockWallets(tx, [quest.creatorId, accepterId]);

    const now = new Date();
    const { count } = await tx.quest.updateMany({
      where: {
        id: questId,
        status: "ACCEPTED",
        accepterId,
        acceptExpiresAt: { gt: now },
      },
      data: { status: "COMPLETED", completedAt: now },
    });
    if (count === 0) throw new QuestError("QUEST_NOT_AVAILABLE");

    await lockInventoryRows(tx, [quest.creatorId, accepterId], [quest.cardId]);
    const taken = await takeAvailableCopies(
      tx,
      accepterId,
      quest.cardId,
      quest.quantity,
    );
    if (!taken) throw new QuestError("NOT_ENOUGH_COPIES");
    await giveCopies(tx, quest.creatorId, quest.cardId, quest.quantity);

    const ref = { refType: "Quest", refId: quest.id };
    await spendFrozenGold(tx, {
      userId: quest.creatorId,
      amount: quest.rewardGold,
      type: "QUEST_REWARD",
      ...ref,
    });
    await applyLedger(tx, {
      userId: accepterId,
      amount: quest.rewardGold,
      type: "QUEST_REWARD",
      ...ref,
    });

    return { id: quest.id };
  });
}

async function reopenTimedOutAcceptances() {
  const { count } = await prisma.quest.updateMany({
    where: { status: "ACCEPTED", acceptExpiresAt: { lte: new Date() } },
    data: REOPEN_DATA,
  });
  return count;
}

async function expireOpenQuests() {
  const stale = await prisma.quest.findMany({
    where: { status: "OPEN", expiresAt: { lte: new Date() } },
    select: { id: true },
    orderBy: { id: "asc" },
  });

  let expired = 0;
  for (const { id } of stale) {
    const done = await prisma.$transaction(async (tx) => {
      const quest = await tx.quest.findUnique({ where: { id } });
      if (!quest) return false;

      await lockWallets(tx, [quest.creatorId]);

      const { count } = await tx.quest.updateMany({
        where: { id, status: "OPEN", expiresAt: { lte: new Date() } },
        data: { status: "EXPIRED" },
      });
      if (count === 0) return false;

      await releaseGold(tx, quest.creatorId, quest.rewardGold);
      return true;
    });
    if (done) expired += 1;
  }
  return expired;
}

export async function expireStaleQuests() {
  const reopened = await reopenTimedOutAcceptances();
  const expired = await expireOpenQuests();
  return { reopened, expired };
}

export async function tryExpireStaleQuests() {
  try {
    await expireStaleQuests();
  } catch (error) {
    console.error("Lazy quest expiry failed:", error);
  }
}

export async function releaseAllQuestsForUser(tx: Tx, userId: string) {
  const quests = await tx.quest.findMany({
    where: {
      OR: [
        { creatorId: userId, status: { in: ["OPEN", "ACCEPTED"] } },
        { accepterId: userId, status: "ACCEPTED" },
      ],
    },
    orderBy: { id: "asc" },
  });
  if (quests.length === 0) return;

  await lockWallets(
    tx,
    quests.map((quest) => quest.creatorId),
  );

  for (const quest of quests) {
    if (quest.creatorId === userId) {
      const { count } = await tx.quest.updateMany({
        where: { id: quest.id, status: { in: ["OPEN", "ACCEPTED"] } },
        data: { status: "CANCELLED" },
      });
      if (count === 1) await releaseGold(tx, quest.creatorId, quest.rewardGold);
    } else {
      await tx.quest.updateMany({
        where: { id: quest.id, status: "ACCEPTED", accepterId: userId },
        data: REOPEN_DATA,
      });
    }
  }
}

export async function listQuestBoard(query: ListCardsQuery) {
  const { page, pageSize } = query;
  const where = {
    status: "OPEN" as const,
    expiresAt: { gt: new Date() },
    card: buildCardWhere(query),
  };

  const [items, total] = await Promise.all([
    prisma.quest.findMany({
      where,
      include: {
        card: true,
        creator: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.quest.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function listMyQuests(userId: string) {
  const [created, accepted] = await Promise.all([
    prisma.quest.findMany({
      where: { creatorId: userId, status: { in: ["OPEN", "ACCEPTED"] } },
      include: { card: true, accepter: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.quest.findMany({
      where: { accepterId: userId, status: "ACCEPTED" },
      include: { card: true, creator: { select: { id: true, name: true } } },
      orderBy: { acceptExpiresAt: "asc" },
    }),
  ]);

  const items = await prisma.inventoryItem.findMany({
    where: { userId, cardId: { in: accepted.map((quest) => quest.cardId) } },
    select: { cardId: true, quantity: true, reservedQuantity: true },
  });
  const availableByCard = new Map(
    items.map((item) => [item.cardId, item.quantity - item.reservedQuantity]),
  );

  return {
    created,
    accepted: accepted.map((quest) => ({
      ...quest,
      available: availableByCard.get(quest.cardId) ?? 0,
    })),
  };
}

export async function listQuestableCards() {
  return prisma.card.findMany({
    select: { id: true, name: true, number: true },
    orderBy: { number: "asc" },
  });
}
