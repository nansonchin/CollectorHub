-- CreateEnum
CREATE TYPE "GuildRole" AS ENUM ('OWNER', 'MODERATOR', 'MEMBER');

-- AlterEnum
ALTER TYPE "LedgerType" ADD VALUE 'GUILD_CREATION';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'GUILD_JOIN_REQUEST';
ALTER TYPE "NotificationType" ADD VALUE 'GUILD_REQUEST_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'GUILD_REQUEST_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE 'GUILD_MEMBER_REMOVED';
ALTER TYPE "NotificationType" ADD VALUE 'GUILD_ROLE_CHANGED';
ALTER TYPE "NotificationType" ADD VALUE 'GUILD_DISBANDED';

-- CreateTable
CREATE TABLE "Guild" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "description" TEXT,
    "announcement" TEXT,
    "announcementUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Guild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildMember" (
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "GuildRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuildMember_pkey" PRIMARY KEY ("guildId","userId")
);

-- CreateTable
CREATE TABLE "GuildJoinRequest" (
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuildJoinRequest_pkey" PRIMARY KEY ("guildId","userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Guild_nameKey_key" ON "Guild"("nameKey");

-- CreateIndex
CREATE INDEX "Guild_createdAt_idx" ON "Guild"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GuildMember_userId_key" ON "GuildMember"("userId");

-- CreateIndex
CREATE INDEX "GuildMember_guildId_role_idx" ON "GuildMember"("guildId", "role");

-- CreateIndex
CREATE INDEX "GuildJoinRequest_userId_idx" ON "GuildJoinRequest"("userId");

-- AddForeignKey
ALTER TABLE "GuildMember" ADD CONSTRAINT "GuildMember_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildMember" ADD CONSTRAINT "GuildMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildJoinRequest" ADD CONSTRAINT "GuildJoinRequest_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildJoinRequest" ADD CONSTRAINT "GuildJoinRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
