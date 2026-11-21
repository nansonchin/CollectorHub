import { prisma } from "@/src/lib/prisma";
import { CreateListingInput } from "./market.schema";
import { MARKET_FEE_PERCENT } from "../economy/economy.config";
import {
  applyLedger,
  InsufficientFundsError,
  Tx,
} from "../economy/wallet.service";
import { ListCardsQuery } from "../cards/cards.schema";
import { buildCardWhere } from "../cards/cards.service";
import { MAX_ACTIVE_RESERVATIONS, RESERVATION_HOURS } from "./market.config";
import { getSellerRatings } from "../reviews/reviews.service";

export type MarketErrorCode =
  | "NOT_ENOUGH_COPIES"
  | "LISTING_NOT_FOUND"
  | "LISTING_NOT_CANCELLABLE"
  | "LISTING_NOT_AVAILABLE"
  | "LISTING_RESERVED"
  | "CANNOT_BUY_OWN_LISTING"
  | "INSUFFICIENT_FUNDS"
  | "RESERVATION_LIMIT"
  | "RESERVATION_NOT_FOUND"
  | "RESERVATION_NOT_CANCELLABLE";

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

async function expireReservations(tx: Tx, scope: { listingId?: string } = {}) {
  const now = new Date();

  const stale = await tx.reservation.findMany({
    where: {
      status: "ACTIVE",
      expiresAt: { lte: now },
      ...(scope.listingId && { listingId: scope.listingId }),
    },
    select: { id: true, listingId: true },
    orderBy: { id: "asc" },
  });

  let expired = 0;
  for (const reservation of stale) {
    const { count } = await tx.reservation.updateMany({
      where: { id: reservation.id, status: "ACTIVE", expiresAt: { lte: now } },
      data: { status: "EXPIRED" },
    });

    if (count === 1) {
      await tx.listing.updateMany({
        where: { id: reservation.listingId, status: "RESERVED" },
        data: { status: "AVAILABLE" },
      });
      expired += 1;
    }
  }

  return expired;
}

export async function expireStaleReservations() {
  return prisma.$transaction((tx) => expireReservations(tx));
}

export async function tryExpireStaleReservation() {
  try {
    await expireStaleReservations();
  } catch (error) {
    console.error("Lazy reservation expiry failed:", error);
  }
}

export async function reserveListing(buyerId: string, listingId: string) {
  return prisma.$transaction(async (tx) => {
    const listing = await tx.listing.findUnique({ where: { id: listingId } });
    if (!listing) {
      throw new MarketError("LISTING_NOT_FOUND");
    }
    if (listing.sellerId === buyerId) {
      throw new MarketError("CANNOT_BUY_OWN_LISTING");
    }

    await expireReservations(tx, { listingId });
    const activeCount = await tx.reservation.count({
      where: { buyerId, status: "ACTIVE" },
    });

    if (activeCount >= MAX_ACTIVE_RESERVATIONS) {
      throw new MarketError("RESERVATION_LIMIT");
    }

    const claimed = await tx.listing.updateMany({
      where: { id: listingId, status: "AVAILABLE" },
      data: { status: "RESERVED" },
    });

    if (claimed.count === 0) {
      const current = await tx.listing.findUnique({
        where: { id: listingId },
        select: { status: true },
      });
      throw new MarketError(
        current?.status === "RESERVED"
          ? "LISTING_RESERVED"
          : "LISTING_NOT_AVAILABLE",
      );
    }

    return tx.reservation.create({
      data: {
        listingId,
        buyerId,
        expiresAt: new Date(Date.now() + RESERVATION_HOURS * 60 * 60 * 1000),
      },
    });
  });
}
export async function cancelReservation(
  buyerId: string,
  reservationId: string,
) {
  return prisma.$transaction(async (tx) => {
    const reservation = await tx.reservation.findFirst({
      where: {
        id: reservationId,
        buyerId,
      },
    });
    if (!reservation) throw new MarketError("RESERVATION_NOT_FOUND");
    const { count } = await tx.reservation.updateMany({
      where: { id: reservationId, status: "ACTIVE" },
      data: { status: "CANCELLED" },
    });
    if (count === 0) throw new MarketError("RESERVATION_NOT_CANCELLABLE");

    await tx.listing.updateMany({
      where: { id: reservation.listingId, status: "RESERVED" },
      data: { status: "AVAILABLE" },
    });

    return { id: reservation.id };
  });
}

export async function purchaseListing(buyerId: string, listingId: string) {
  return prisma.$transaction(async (tx) => {
    const listing = await tx.listing.findUnique({ where: { id: listingId } });
    if (!listing) throw new MarketError("LISTING_NOT_FOUND");
    if (listing.sellerId === buyerId)
      throw new MarketError("CANNOT_BUY_OWN_LISTING");

    //locked
    await tx.$queryRaw`
      SELECT "userId" FROM "Wallet"
      WHERE "userId" IN (${buyerId}, ${listing.sellerId})
      ORDER BY "userId"
      FOR UPDATE
    `;

    await expireReservations(tx, { listingId });

    const reservation = await tx.reservation.findFirst({
      where: {
        listingId,
        status: "ACTIVE",
      },
    });

    if (reservation && reservation.buyerId !== buyerId) {
      throw new MarketError("LISTING_RESERVED");
    }

    if (reservation) {
      const used = await tx.reservation.updateMany({
        where: {
          id: reservation.id,
          status: "ACTIVE",
          expiresAt: { gt: new Date() },
        },
        data: { status: "PURCHASED" },
      });
      if (used.count === 0) throw new MarketError("LISTING_NOT_AVAILABLE");
    }

    const claimed = await tx.listing.updateMany({
      where: { id: listingId, status: reservation ? "RESERVED" : "AVAILABLE" },
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

export async function listMyListings(sellerId: string) {
  return prisma.listing.findMany({
    where: { sellerId, status: { in: ["AVAILABLE", "RESERVED"] } },
    include: {
      card: true,
      reservations: {
        where: { status: "ACTIVE" },
        select: { expiresAt: true },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });
}
export async function listMyReservations(buyerId: string) {
  return prisma.reservation.findMany({
    where: { buyerId, status: "ACTIVE" },
    include: {
      listing: {
        include: { card: true, seller: { select: { id: true, name: true } } },
      },
    },
    orderBy: { expiresAt: "asc" },
  });
}

export async function listMarketListings(query: ListCardsQuery) {
  const { page, pageSize } = query;
  const where = {
    status: { in: ["AVAILABLE", "RESERVED"] as ("AVAILABLE" | "RESERVED")[] },
    card: buildCardWhere(query),
  };

  const [items, total] = await Promise.all([
       prisma.listing.findMany({
      where,
      include: {
        card: true,
        seller: { select: { id: true, name: true } },
        reservations: {
          where: { status: "ACTIVE" },
          select: { id: true, buyerId: true, expiresAt: true },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.listing.count({ where }),
  ]);

  const ratings =await getSellerRatings(items.map((item)=>item.sellerId))


  return {
      items: items.map((item) => ({
      ...item,
      sellerRating: ratings.get(item.sellerId) ?? null,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function listMyOrders(userId: string) {
  return prisma.order.findMany({
    where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
    include: {
      card: true,
      buyer: { select: { id: true, name: true } },
      seller: { select: { id: true, name: true } },
      reviews: { where: { reviewerId: userId }, select: { rating: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50, 
  });
}