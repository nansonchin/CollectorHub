import { prisma } from "@/src/lib/prisma";
import { CreateListingInput } from "./market.schema";

export type MarketErrorCode =
  | "NOT_ENOUGH_COPIES"
  | "LISTING_NOT_FOUND"
  | "LISTING_NOT_CANCELLABLE";

export class MarketError extends Error {
  constructor(public readonly code: MarketErrorCode) {
    super(code);
    this.name = "MarketError";
  }
}

export async function createListing(
  sellerId: string,
  input: CreateListingInput,
) {
  const { cardId, quantity, unitPrice } = input;
  return prisma.$transaction(async (tx) => {
    const locked = await tx.$executeRaw`
      UPDATE "InventoryItem"
      SET "reservedQuantity" = "reservedQuantity" + ${quantity}::int,
          "updatedAt" = NOW()
      WHERE "userId" = ${sellerId}
        AND "cardId" = ${cardId}
        AND "quantity" - "reservedQuantity" >= ${quantity}::int
    `;
    if (locked === 0) throw new MarketError("NOT_ENOUGH_COPIES");

    return tx.listing.create({
      data: { sellerId, cardId, quantity, unitPrice },
    });
  });
}

export async function cancelListing(sellerId: string, listingId: string) {
  return prisma.$transaction(async (tx) => {
    const listing = await tx.listing.findFirst({
      where: { id: listingId, sellerId },
    });

    if (!listing) throw new MarketError("LISTING_NOT_FOUND");
    const { count } = await tx.listing.updateMany({
      where: { id: listingId, status: "AVAILABLE" },
      data: { status: "CANCELLED" },
    });

    if (count === 0) throw new MarketError("LISTING_NOT_CANCELLABLE");

    await tx.inventoryItem.update({
      where: { userId_cardId: { userId: sellerId, cardId: listing.cardId } },
      data: { reservedQuantity: { decrement: listing.quantity } },
    });

    return { id: listing.id };
  });
}

export async function listMyListings(sellerId: string) {
  return prisma.listing.findMany({
    where: { sellerId, status: "AVAILABLE" },
    include: { card: true },
    orderBy: { createdAt: "desc" },
  });
}
