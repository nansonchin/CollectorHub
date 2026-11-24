-- CreateEnum
CREATE TYPE "QuestStatus" AS ENUM ('OPEN', 'ACCEPTED', 'COMPLETED', 'CANCELLED', 'EXPIRED');

-- CreateTable
CREATE TABLE "Quest" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "rewardGold" INTEGER NOT NULL,
    "status" "QuestStatus" NOT NULL DEFAULT 'OPEN',
    "accepterId" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "acceptExpiresAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Quest_status_cardId_idx" ON "Quest"("status", "cardId");

-- CreateIndex
CREATE INDEX "Quest_creatorId_status_idx" ON "Quest"("creatorId", "status");

-- CreateIndex
CREATE INDEX "Quest_accepterId_status_idx" ON "Quest"("accepterId", "status");

-- CreateIndex
CREATE INDEX "Quest_status_expiresAt_idx" ON "Quest"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "Quest_status_acceptExpiresAt_idx" ON "Quest"("status", "acceptExpiresAt");

-- AddForeignKey
ALTER TABLE "Quest" ADD CONSTRAINT "Quest_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quest" ADD CONSTRAINT "Quest_accepterId_fkey" FOREIGN KEY ("accepterId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quest" ADD CONSTRAINT "Quest_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Quest" ADD CONSTRAINT "Quest_quantity_positive" CHECK ("quantity" > 0);
ALTER TABLE "Quest" ADD CONSTRAINT "Quest_rewardGold_positive" CHECK ("rewardGold" > 0);
ALTER TABLE "Quest" ADD CONSTRAINT "Quest_not_self" CHECK ("accepterId" IS NULL OR "accepterId" <> "creatorId");