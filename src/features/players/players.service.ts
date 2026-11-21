import { prisma } from "@/src/lib/prisma";

export async function getPlayerProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, createdAt: true },
  });
  if (!user) return null;

  const [tradeCount, rating, reviews] = await Promise.all([
    prisma.order.count({
      where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
    }),
  
    prisma.review.aggregate({
      where: { targetId: userId },
      _avg: { rating: true },
      _count: { _all: true },
    }),
    prisma.review.findMany({
      where: { targetId: userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        rating: true,
        tags: true,
        comment: true,
        createdAt: true,
        reviewer: { select: { id: true, name: true } },
      },
    }),
  ]);

  return {
    user,
    tradeCount,
    ratingAverage: rating._avg.rating,
    ratingCount: rating._count._all,
    reviews,
  };
}