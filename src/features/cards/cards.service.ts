import { prisma } from "@/src/lib/prisma";
import type { ListCardsQuery } from "./cards.schema";

type CardFilters = Pick<ListCardsQuery, "element" | "rarity" | "q">;

export function buildCardWhere({ element, rarity, q }: CardFilters) {
  return {
    ...(element && { element }),
    ...(rarity && { rarity }),
    ...(q && { name: { contains: q, mode: "insensitive" as const } }),
  };
}

export async function listCards(query: ListCardsQuery) {
  const { page, pageSize } = query;
  const where = buildCardWhere(query);

  const [items, total] = await Promise.all([
    prisma.card.findMany({
      where,
      orderBy: { number: "asc" },
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

export async function getCardByNumber(number: number) {
  return prisma.card.findUnique({ where: { number } });
}

export async function getCardDetail(
  number: number,
  filters: CardFilters,
  pageSize: number,
) {
  const card = await getCardByNumber(number);
  if (!card) return null;

  const where = buildCardWhere(filters);

  const [indexBefore, previous, next] = await Promise.all([
    prisma.card.count({ where: { ...where, number: { lt: number } } }),
    prisma.card.findFirst({
      where: { ...where, number: { lt: number } },
      orderBy: { number: "desc" },
      select: { number: true, name: true },
    }),
    prisma.card.findFirst({
      where: { ...where, number: { gt: number } },
      orderBy: { number: "asc" },
      select: { number: true, name: true },
    }),
  ]);

  const pageOf = (index: number) => Math.floor(index / pageSize) + 1;

  return {
    card,
    previous: previous && { ...previous, page: pageOf(indexBefore - 1) },
    next: next && { ...next, page: pageOf(indexBefore + 1) },
  };
}