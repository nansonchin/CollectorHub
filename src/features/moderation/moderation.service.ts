import { Role } from "@/src/lib/authz";
import { CreateReportInput, ResolveReportInput } from "./moderation.schema";
import { prisma } from "@/src/lib/prisma";
import { MAX_REPORTS_PER_DAY, ResolveActionId } from "./moderation.config";
import { Tx } from "../economy/wallet.service";
import { releaseAllTradesForUser } from "../trades/trades.service";
import { releaseAllQuestsForUser } from "../quests/quests.service";
import { notify } from "../notifications/notifications.service";

// admin || moderator function reporting
export type ModerationErrorCode =
  | "TARGET_NOT_FOUND"
  | "CANNOT_REPORT_SELF"
  | "ALREADY_REPORTED"
  | "REPORT_LIMIT"
  | "REPORT_NOT_FOUND"
  | "REPORT_ALREADY_HANDLED"
  | "ACTION_NOT_ALLOWED"
  | "MESSAGE_REQUIRED"
  | "INVALID_ACTION"
  | "NOT_BANNED";

export class ModerationError extends Error {
  constructor(public readonly code: ModerationErrorCode) {
    super(code);
    this.name = "ModerationError";
  }
}

type Actor = { id: string; role: Role };

export async function createReport(
  reporterId: string,
  input: CreateReportInput,
) {
  const { targetType, targetId, reason, details } = input;
  let targetUserId: string | null = null;
  if (targetType === "LISTING") {
    const listing = await prisma.listing.findUnique({
      where: { id: targetId },
      select: { sellerId: true },
    });
    targetUserId = listing?.sellerId ?? null;
  } else if (targetType === "USER") {
    const user = await prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true },
    });
    targetUserId = user?.id ?? null;
  } else {
    const review = await prisma.review.findUnique({
      where: { id: targetId },
      select: { reviewerId: true },
    });
    targetUserId = review?.reviewerId ?? null;
  }

  if (!targetUserId) {
    throw new ModerationError("TARGET_NOT_FOUND");
  }

  if (targetUserId === reporterId) {
    throw new ModerationError("CANNOT_REPORT_SELF");
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recent = await prisma.report.count({
    where: { reporterId, createdAt: { gte: since } },
  });
  if (recent >= MAX_REPORTS_PER_DAY) throw new ModerationError("REPORT_LIMIT");

  const { count } = await prisma.report.createMany({
    data: [
      {
        reporterId,
        targetType,
        targetId,
        targetUserId,
        reason,
        details: details ?? null,
      },
    ],
    skipDuplicates: true,
  });
  if (count === 0) throw new ModerationError("ALREADY_REPORTED");
}

export async function forceCancelListing(tx: Tx, listingId: string) {
  await tx.reservation.updateMany({
    where: { listingId, status: "ACTIVE" },
    data: {
      status: "CANCELLED",
    },
  });

  const listing = await tx.listing.findUnique({
    where: { id: listingId },
  });
  if (!listing) {
    return false;
  }
  const { count } = await tx.listing.updateMany({
    where: { id: listingId, status: { in: ["AVAILABLE", "RESERVED"] } },
    data: { status: "CANCELLED" },
  });
  if (count === 0) return false;
  await tx.inventoryItem.update({
    where: {
      userId_cardId: { userId: listing.sellerId, cardId: listing.cardId },
    },
    data: { reservedQuantity: { decrement: listing.quantity } },
  });
  return true;
}

export async function banUser(tx: Tx, userId: string, reason: string) {
  await tx.user.update({
    where: { id: userId },
    data: { bannedAt: new Date(), banReason: reason },
  });

  await tx.session.deleteMany({ where: { userId } });
  await releaseAllTradesForUser(tx, userId);
  await releaseAllQuestsForUser(tx, userId);

  const reservations = await tx.reservation.findMany({
    where: { buyerId: userId, status: "ACTIVE" },
    select: { id: true, listingId: true },
    orderBy: { id: "asc" },
  });
  for (const reservation of reservations) {
    const { count } = await tx.reservation.updateMany({
      where: { id: reservation.id, status: "ACTIVE" },
      data: { status: "CANCELLED" },
    });
    if (count === 1) {
      await tx.listing.updateMany({
        where: { id: reservation.listingId, status: "RESERVED" },
        data: { status: "AVAILABLE" },
      });
    }
  }
  const listings = await tx.listing.findMany({
    where: { sellerId: userId, status: { in: ["AVAILABLE", "RESERVED"] } },
    select: { id: true },
    orderBy: { id: "asc" },
  });
  for (const listing of listings) {
    await forceCancelListing(tx, listing.id);
  }
}

const LOG_TYPE: Record<
  ResolveActionId,
  "DISMISS_REPORT" | "REMOVE_LISTING" | "HIDE_REVIEW" | "WARN_USER" | "BAN_USER"
> = {
  DISMISS: "DISMISS_REPORT",
  REMOVE_LISTING: "REMOVE_LISTING",
  HIDE_REVIEW: "HIDE_REVIEW",
  WARN_USER: "WARN_USER",
  BAN_USER: "BAN_USER",
};

export async function resolveReport(
  actor: Actor,
  reportId: string,
  input: ResolveReportInput,
) {
  const { action, note, message } = input;

  if (action === "BAN_USER" && actor.role !== "ADMIN") {
    throw new ModerationError("ACTION_NOT_ALLOWED");
  }
  if ((action === "WARN_USER" || action === "BAN_USER") && !message) {
    throw new ModerationError("MESSAGE_REQUIRED");
  }

  return prisma.$transaction(async (tx) => {
    const report = await tx.report.findUnique({ where: { id: reportId } });
    if (!report) throw new ModerationError("REPORT_NOT_FOUND");

    if (action === "REMOVE_LISTING" && report.targetType !== "LISTING") {
      throw new ModerationError("INVALID_ACTION");
    }
    if (action === "HIDE_REVIEW" && report.targetType !== "REVIEW") {
      throw new ModerationError("INVALID_ACTION");
    }

    if (action === "WARN_USER" || action === "BAN_USER") {
      if (report.targetUserId === actor.id)
        throw new ModerationError("ACTION_NOT_ALLOWED");
      const target = await tx.user.findUnique({
        where: { id: report.targetUserId },
        select: { role: true },
      });
      if (!target || target.role === "ADMIN")
        throw new ModerationError("ACTION_NOT_ALLOWED");
    }

    const now = new Date();
    const claimed = await tx.report.updateMany({
      where: { id: reportId, status: "OPEN" },
      data: {
        status: action === "DISMISS" ? "DISMISSED" : "RESOLVED",
        handledById: actor.id,
        handledAt: now,
      },
    });
    if (claimed.count === 0)
      throw new ModerationError("REPORT_ALREADY_HANDLED");

    switch (action) {
      case "REMOVE_LISTING":
        await forceCancelListing(tx, report.targetId);
        break;
      case "HIDE_REVIEW":
        await tx.review.updateMany({
          where: { id: report.targetId, hiddenAt: null },
          data: { hiddenAt: now },
        });
        break;
      case "BAN_USER":
        await banUser(tx, report.targetUserId, message!);
        break;
      case "WARN_USER":
        await notify(tx, {
          userId: report.targetUserId,
          type: "MODERATION_WARNING",
          data: { message: message! },
        });
        break;
    }

    if (action !== "DISMISS") {
      await tx.report.updateMany({
        where: {
          status: "OPEN",
          OR: [
            { targetType: report.targetType, targetId: report.targetId },
            ...(action === "BAN_USER"
              ? [{ targetUserId: report.targetUserId }]
              : []),
          ],
        },
        data: { status: "RESOLVED", handledById: actor.id, handledAt: now },
      });
    }

    await tx.adminAction.create({
      data: {
        adminId: actor.id,
        type: LOG_TYPE[action],
        reportId,
        targetUserId: report.targetUserId,
        targetType: report.targetType,
        targetId: report.targetId,
        note: note ?? null,
        message: message ?? null,
      },
    });
  });
}

export async function unBanUser(actor: Actor, userId: string) {
  if (actor.role !== "ADMIN") {
    throw new ModerationError("ACTION_NOT_ALLOWED");
  }
  await prisma.$transaction(async (tx) => {
    const { count } = await tx.user.updateMany({
      where: {
        id: userId,
        bannedAt: { not: null },
      },
      data: {
        bannedAt: null,
        banReason: null,
      },
    });
    if (count === 0) throw new ModerationError("NOT_BANNED");
    await tx.adminAction.create({
      data: {
        adminId: actor.id,
        type: "UNBAN_USER",
        targetUserId: userId,
      },
    });
  });
}

// Search Inqury

export type TargetSummary =
  | {
      kind: "LISTING";
      cardName: string;
      quantity: number;
      unitPrice: number;
      status: string;
    }
  | { kind: "USER" }
  | { kind: "REVIEW"; rating: number; comment: string | null; hidden: boolean }
  | { kind: "MISSING" };
export async function listOpenReports() {
  const reports = await prisma.report.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "asc" },
    include: {
      reporter: { select: { name: true } },
      targetUser: {
        select: { id: true, name: true, role: true, bannedAt: true },
      },
    },
  });

  const idsOf = (type: string) =>
    reports.filter((r) => r.targetType === type).map((r) => r.targetId);
  const userIds = [...new Set(reports.map((r) => r.targetUserId))];

  const [listings, reviews, totals] = await Promise.all([
    prisma.listing.findMany({
      where: { id: { in: idsOf("LISTING") } },
      select: {
        id: true,
        quantity: true,
        unitPrice: true,
        status: true,
        card: { select: { name: true } },
      },
    }),
    prisma.review.findMany({
      where: { id: { in: idsOf("REVIEW") } },
      select: { id: true, rating: true, comment: true, hiddenAt: true },
    }),
    // 这个人一共被举报过几次（包括已处理的），帮助判断他是不是惯犯
    prisma.report.groupBy({
      by: ["targetUserId"],
      where: { targetUserId: { in: userIds } },
      _count: { _all: true },
    }),
  ]);

  const listingById = new Map(listings.map((l) => [l.id, l]));
  const reviewById = new Map(reviews.map((r) => [r.id, r]));
  const totalByUser = new Map(
    totals.map((t) => [t.targetUserId, t._count._all]),
  );

  return reports.map((report) => {
    let target: TargetSummary = { kind: "MISSING" };

    if (report.targetType === "LISTING") {
      const listing = listingById.get(report.targetId);
      if (listing) {
        target = {
          kind: "LISTING",
          cardName: listing.card.name,
          quantity: listing.quantity,
          unitPrice: listing.unitPrice,
          status: listing.status,
        };
      }
    } else if (report.targetType === "REVIEW") {
      const review = reviewById.get(report.targetId);
      if (review) {
        target = {
          kind: "REVIEW",
          rating: review.rating,
          comment: review.comment,
          hidden: review.hiddenAt !== null,
        };
      }
    } else {
      target = { kind: "USER" };
    }

    return {
      ...report,
      target,
      totalAgainstUser: totalByUser.get(report.targetUserId) ?? 0,
    };
  });
}

export async function listBannedUsers() {
  return prisma.user.findMany({
    where: {
      bannedAt: { not: null },
    },
    select: { id: true, name: true, bannedAt: true, banReason: true },
    orderBy: { bannedAt: "desc" },
  });
}

export async function listRecentActions(take = 20) {
  return prisma.adminAction.findMany({
    orderBy: { createdAt: "desc" },
    take,
    include: {
      admin: { select: { name: true } },
      targetUser: { select: { id: true, name: true } },
    },
  });
}

export async function listNoticesForUser(userId: string) {
  return prisma.adminAction.findMany({
    where: { targetUserId: userId, type: "WARN_USER" },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, message: true, createdAt: true },
  });
}
