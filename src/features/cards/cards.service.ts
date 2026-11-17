import { prisma } from "@/src/lib/prisma";
import type { ListCardsQuery } from "./cards.schema";
export async function listCards(query: ListCardsQuery) {
  const { element, rarity, q, page, pageSize } = query;

  const where = {
    ...(element && { element }),
    ...(rarity && { rarity }),
    ...(q && { name: { contains: q, mode: "insensitive" as const } }),
  };
  const [items, total] = await Promise.all([
    prisma.card.findMany({
      where,
      skip: (page - 1) * pageSize, 
      take: pageSize,
    }),
    prisma.card.count({ where }),
  ]);
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
