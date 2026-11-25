import { prisma } from "@/src/lib/prisma";
import { CreateReviewInput } from "./reviews.schema";
import { notify, userName } from "../notifications/notifications.service";

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

  if (!order || (order.buyerId !== reviewerId && order.sellerId !== reviewerId)) {
    throw new ReviewError("ORDER_NOT_FOUND");
  }

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
    try {
    await notify(prisma, {
      userId: targetId,
      type: "REVIEW_RECEIVED",
      data: {
        orderId,
        rating: input.rating,
        reviewerName: await userName(prisma, reviewerId),
      },
    });
  } catch (error) {
    console.error("Failed to notify about a new review:", error);
  }
}

export async function getSellerRatings(sellerIds: string[]) {
  const unique = [...new Set(sellerIds)];
  if (unique.length === 0) return new Map<string, { avg: number; count: number }>();

  const rows = await prisma.review.groupBy({
    by: ["targetId"],
    where: { targetId: { in: unique }, hiddenAt: null },
    _avg: { rating: true },
    _count: { _all: true },
  });

  return new Map(
    rows.map((row) => [row.targetId, { avg: row._avg.rating ?? 0, count: row._count._all }]),
  );
}