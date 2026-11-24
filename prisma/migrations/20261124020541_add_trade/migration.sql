-- CreateEnum
CREATE TYPE "TradeStatus" AS ENUM ('PENDING', 'COMPLETED', 'REJECTED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "TradeSide" AS ENUM ('OFFER', 'REQUEST');

-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL,
    "proposerId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "status" "TradeStatus" NOT NULL DEFAULT 'PENDING',
    "offeredGold" INTEGER NOT NULL DEFAULT 0,
    "requestedGold" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradeItem" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "side" "TradeSide" NOT NULL,
    "cardId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "TradeItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Trade_recipientId_status_idx" ON "Trade"("recipientId", "status");

-- CreateIndex
CREATE INDEX "Trade_proposerId_status_idx" ON "Trade"("proposerId", "status");

-- CreateIndex
CREATE INDEX "Trade_status_expiresAt_idx" ON "Trade"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "TradeItem_cardId_idx" ON "TradeItem"("cardId");

-- CreateIndex
CREATE UNIQUE INDEX "TradeItem_tradeId_side_cardId_key" ON "TradeItem"("tradeId", "side", "cardId");

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_proposerId_fkey" FOREIGN KEY ("proposerId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeItem" ADD CONSTRAINT "TradeItem_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeItem" ADD CONSTRAINT "TradeItem_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Trade" ADD CONSTRAINT "Trade_not_self" CHECK ("proposerId" <> "recipientId");
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_gold_nonnegative" CHECK ("offeredGold" >= 0 AND "requestedGold" >= 0);
ALTER TABLE "TradeItem" ADD CONSTRAINT "TradeItem_quantity_positive" CHECK ("quantity" > 0);