import { prisma } from "@/src/lib/prisma";
import { grantStarterPack } from "./starter-pack.service";
import { ca } from "zod/locales";
import { RARITIES } from "../cards/cards.schema";
import { cache } from "react";


export async function loadWalletBalance(userId: string) {
  const find = () => {
    return prisma.wallet.findUnique({
      where: { userId },
      select: { balance: true },
    });
  };

  const wallet = await find();
  if (wallet) return wallet.balance;

  try {
    await grantStarterPack(userId);
    return (await find())?.balance ?? 0;
  } catch (error) {
    console.error(`Starter pack retry failed for user ${userId}:`, error);
    return 0;
  }
}

export const getWalletBalance = cache(loadWalletBalance);

export async function getOwnedQuantities(userId: string, cardIds: string[]) {
  if (cardIds.length === 0) return new Map<string, number>();
  const rows = await prisma.inventoryItem.findMany({
    where: { userId, cardId: { in: cardIds }, quantity: { gt: 0 } },
    select: { cardId: true, quantity: true },
  });

  return new Map(rows.map((row) => [row.cardId, row.quantity]));
}

export async function getInventoryOverview(userId: string) {
  const [items, totals] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: { userId, quantity: { gt: 0 } },
      include: { card: true },
      orderBy: { card: { number: "asc" } },
    }),
    prisma.card.groupBy({ by: ["rarity"], _count: { _all: true } }),
  ]);
  const totalByRarity = new Map(
    totals.map((row) => [row.rarity, row._count._all]),
  );
  const ownedByRarity = new Map<string, number>();
  for (const item of items) {
    const rarity = item.card.rarity;
    ownedByRarity.set(rarity, (ownedByRarity.get(rarity) ?? 0) + 1);
  }

  const byRarity = RARITIES.map((rarity) => ({
    rarity,
    owned: ownedByRarity.get(rarity) ?? 0,
    total: totalByRarity.get(rarity) ?? 0,
  }));
  return {
    items,
    ownedCards: items.length,
    totalCards: byRarity.reduce((sum, row) => sum + row.total, 0),
    copies: items.reduce((sum, item) => sum + item.quantity, 0),
    byRarity,
  };
}

export async function listRecentLedger(userId:string,take=20){
  return prisma.ledgerEntry.findMany({
    where:{userId},
    orderBy:{createdAt:"desc"},
    take
  })
}