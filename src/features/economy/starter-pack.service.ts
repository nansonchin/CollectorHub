import { prisma } from "@/src/lib/prisma";
import { STARTER_GOLD } from "./economy.config";
import { applyLedger } from "./wallet.service";

export async function grantStarterPack(userId: string) {
  return prisma.$transaction(async (tx) => {
    const { count } = await tx.wallet.createMany({
      data: [{ userId }],
      skipDuplicates: true,
    });
    if (count === 0) return { granted: false as const };

    await applyLedger(tx, {
      userId,
      amount: STARTER_GOLD,
      type: "SIGNUP_BONUS",
    });

    const commons = await tx.card.findMany({
      where: { rarity: "COMMON" },
      select: { id: true, element: true },
    });

    const idsByElement = new Map<string, string[]>();
    for (const card of commons) {
      const ids = idsByElement.get(card.element) ?? [];
      ids.push(card.id);
      idsByElement.set(card.element, ids);
    }

    const cardIds = [...idsByElement.values()].map(
      (ids) => ids[Math.floor(Math.random() * ids.length)],
    );

    await tx.inventoryItem.createMany({
      data: cardIds.map((cardId) => ({ userId, cardId, quantity: 1 })),
    });

    return { granted: true as const, gold: STARTER_GOLD, cardCount: cardIds.length };
  });
}
