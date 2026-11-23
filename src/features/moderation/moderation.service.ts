import { Role } from "@/src/lib/authz";
import { CreateReportInput } from "./moderation.schema";
import { prisma } from "@/src/lib/prisma";
import { MAX_REPORTS_PER_DAY } from "./moderation.config";
import { Tx } from "../economy/wallet.service";

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
  }else {
    const review = await prisma.review.findUnique({
      where: { id: targetId },
      select: { reviewerId: true },
    });
    targetUserId = review?.reviewerId ?? null;
  }

  if(!targetUserId){
    throw new ModerationError("TARGET_NOT_FOUND")
  }

  if(targetUserId === reporterId){
    throw new ModerationError("CANNOT_REPORT_SELF")
  }

  const since = new Date(Date.now()-24*60*60*1000)
  const recent = await prisma.report.count({
    where:{reporterId,createdAt:{gte:since}}
  })
  if(recent >= MAX_REPORTS_PER_DAY) throw new ModerationError("REPORT_LIMIT")

      const { count } = await prisma.report.createMany({
    data: [{ reporterId, targetType, targetId, targetUserId, reason, details: details ?? null }],
    skipDuplicates: true,
  });
  if (count === 0) throw new ModerationError("ALREADY_REPORTED");
}

export async function forceCancelListing(tx:Tx,listingId:string){
    await tx.reservation.updateMany({
        where:{listingId,status:"ACTIVE"},
        data:{
            status:"CANCELLED"
        }
    })
}