import { prisma } from "@/src/lib/prisma";
import { CreateReviewInput } from "./reviews.schema";

export type ReviewErrorCode = "ORDER_NOT_FOUND" | "ALREADY_REVIEWED";

export class ReviewError extends Error {
  constructor(public readonly code: ReviewErrorCode) {
    super(code);
    this.name = "ReviewError";
  }
}

export async function createReview(
  reviewerId: string,
  orderId: string,
  input: CreateReviewInput,
) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });

  // 不是这笔订单的买家或卖家，就当作"订单不存在"：
  // 不告诉陌生人"这个订单号存在，只是和你无关"。
  if (!order || (order.buyerId !== reviewerId && order.sellerId !== reviewerId)) {
    throw new ReviewError("ORDER_NOT_FOUND");
  }

  // 被评的人由订单决定，不由客户端决定：评价者是买家，对方就是卖家，反之亦然。
  const targetId = order.buyerId === reviewerId ? order.sellerId : order.buyerId;

  const { count } = await prisma.review.createMany({
    data: [
      {
        orderId,
        reviewerId,
        targetId,
        rating: input.rating,
        tags: [...new Set(input.tags)],
        comment: input.comment ?? null,
      },
    ],
    skipDuplicates: true,
  });

  if (count === 0) throw new ReviewError("ALREADY_REVIEWED");
}

export async function getSellerRatings(sellerIds: string[]) {
  const unique = [...new Set(sellerIds)];
  if (unique.length === 0) return new Map<string, { avg: number; count: number }>();

  const rows = await prisma.review.groupBy({
    by: ["targetId"],
    where: { targetId: { in: unique } },
    _avg: { rating: true },
    _count: { _all: true },
  });

  return new Map(
    rows.map((row) => [row.targetId, { avg: row._avg.rating ?? 0, count: row._count._all }]),
  );
}