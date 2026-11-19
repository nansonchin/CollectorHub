import { prisma } from "@/src/lib/prisma";
import { CreateListingInput } from "./market.schema";
import { MARKET_FEE_PERCENT } from "../economy/economy.config";
import { applyLedger, InsufficientFundsError } from "../economy/wallet.service";
import { ListCardsQuery } from "../cards/cards.schema";
import { buildCardWhere } from "../cards/cards.service";

export type MarketErrorCode =
  | "NOT_ENOUGH_COPIES"
  | "LISTING_NOT_FOUND"
  | "LISTING_NOT_CANCELLABLE"
  | "LISTING_NOT_AVAILABLE"
  | "CANNOT_BUY_OWN_LISTING"
  | "INSUFFICIENT_FUNDS";

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
export async function purchaseListing(buyerId: string, listingId: string) {
  return prisma.$transaction(async (tx) => {
    const listing = await tx.listing.findUnique({ where: { id: listingId } });
    if (!listing) throw new MarketError("LISTING_NOT_FOUND");
    if (listing.sellerId === buyerId)
      throw new MarketError("CANNOT_BUY_OWN_LISTING");

    await tx.$queryRaw`
      SELECT "userId" FROM "Wallet"
      WHERE "userId" IN (${buyerId}, ${listing.sellerId})
      ORDER BY "userId"
      FOR UPDATE
    `;

    const claimed = await tx.listing.updateMany({
      where: { id: listingId, status: "AVAILABLE" },
      data: { status: "SOLD" },
    });
    if (claimed.count === 0) throw new MarketError("LISTING_NOT_AVAILABLE");

    const totalPrice = listing.quantity * listing.unitPrice;
    const fee = Math.floor((totalPrice * MARKET_FEE_PERCENT) / 100);

    const order = await tx.order.create({
      data: {
        buyerId,
        sellerId: listing.sellerId,
        listingId: listing.id,
        cardId: listing.cardId,
        quantity: listing.quantity,
        unitPrice: listing.unitPrice,
        totalPrice,
        fee,
      },
    });
    const ref = { refType: "Order", refId: order.id };

    try {
      await applyLedger(tx, {
        userId: buyerId,
        amount: -totalPrice,
        type: "PURCHASE",
        ...ref,
      });
    } catch (error) {
      if (error instanceof InsufficientFundsError) {
        throw new MarketError("INSUFFICIENT_FUNDS");
      }
      throw error;
    }

    await applyLedger(tx, {
      userId: listing.sellerId,
      amount: totalPrice,
      type: "SALE_INCOME",
      ...ref,
    });
    if (fee > 0) {
      await applyLedger(tx, {
        userId: listing.sellerId,
        amount: -fee,
        type: "FEE",
        ...ref,
      });
    }

    await tx.inventoryItem.update({
      where: {
        userId_cardId: { userId: listing.sellerId, cardId: listing.cardId },
      },
      data: {
        quantity: { decrement: listing.quantity },
        reservedQuantity: { decrement: listing.quantity },
      },
    });

    await tx.inventoryItem.upsert({
      where: { userId_cardId: { userId: buyerId, cardId: listing.cardId } },
      create: {
        userId: buyerId,
        cardId: listing.cardId,
        quantity: listing.quantity,
      },
      update: { quantity: { increment: listing.quantity } },
    });

    return order;
  });
}

export async function listMarketListings(query: ListCardsQuery) {
  const { page, pageSize } = query;
  const where = {
    status: "AVAILABLE" as const,
    card: buildCardWhere(query),
  };

  const [items, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      include: {
        card: true,
        seller: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.listing.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
