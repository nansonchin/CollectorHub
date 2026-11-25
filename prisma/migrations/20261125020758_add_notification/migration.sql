-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('TRADE_OFFER_RECEIVED', 'TRADE_ACCEPTED', 'TRADE_REJECTED', 'TRADE_CANCELLED', 'TRADE_EXPIRED', 'QUEST_ACCEPTED', 'QUEST_DELIVERED', 'QUEST_REOPENED', 'QUEST_HOLD_EXPIRED', 'QUEST_EXPIRED', 'LISTING_SOLD', 'LISTING_RESERVED', 'RESERVATION_EXPIRED', 'REVIEW_RECEIVED', 'MODERATION_WARNING');

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
