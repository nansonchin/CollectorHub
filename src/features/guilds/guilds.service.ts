import { prisma } from "@/src/lib/prisma";
import {
  applyLedger,
  InsufficientFundsError,
  Tx,
} from "../economy/wallet.service";
import {
  CreateGuildInput,
  MemberAction,
  UpdateGuildInput,
} from "./guilds.schema";
import { randomUUID } from "crypto";
import {
  GUILD_CREATION_COST,
  GUILDS_PER_PAGE,
  MAX_GUILD_MEMBERS,
  MAX_PENDING_REQUESTS,
} from "./guilds.config";
import {
  canEditAnnouncement,
  canEditProfile,
  canKick,
  canManageRoles,
  canReviewRequests,
  GuildRole,
} from "./guilds.permissions";
import { notify, userName } from "../notifications/notifications.service";

export type GuildErrorCode =
  | "NAME_TAKEN"
  | "ALREADY_IN_GUILD"
  | "INSUFFICIENT_FUNDS"
  | "GUILD_NOT_FOUND"
  | "GUILD_FULL"
  | "TOO_MANY_REQUESTS"
  | "ALREADY_REQUESTED"
  | "REQUEST_NOT_FOUND"
  | "FORBIDDEN"
  | "OWNER_CANNOT_LEAVE"
  | "NOT_A_MEMBER"
  | "INVALID_TARGET";

export class GuildError extends Error {
  constructor(public readonly code: GuildErrorCode) {
    super(code);
    this.name = "GuildError";
  }
}

async function lockGuild(tx: Tx, guildId: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "GUILD" WHERE "id" = ${guildId} FOR UPDATE
    `;
  if (rows.length === 0) throw new GuildError("GUILD_NOT_FOUND");
}

async function getMember(tx: Tx, guildId: string, userId: string) {
  return tx.guildMember.findUnique({
    where: {
      guildId_userId: {
        guildId,
        userId,
      },
    },
  });
}

async function reviewerIds(tx: Tx, guildId: string) {
  const members = await tx.guildMember.findMany({
    where: { guildId, role: { in: ["OWNER", "MODERATOR"] } },
    select: { userId: true },
  });
  return members.map((member) => member.userId);
}

export async function createGuild(userId: string, input: CreateGuildInput) {
  const name = input.name.replace(/\s+/g, " ").trim();
  const nameKey = name.toLowerCase();

  return prisma.$transaction(async (tx) => {
    const existing = await tx.guildMember.findUnique({
      where: {
        userId,
      },
    });

    if (existing) {
      throw new GuildError("ALREADY_IN_GUILD");
    }

    const id = randomUUID();
    try {
      await applyLedger(tx, {
        userId,
        amount: -GUILD_CREATION_COST,
        type: "GUILD_CREATION",
        refType: "Guild",
        refId: id,
      });
    } catch (error) {
      if (error instanceof InsufficientFundsError)
        throw new GuildError("INSUFFICIENT_FUNDS");
      throw error;
    }

    const { count } = await tx.guild.createMany({
      data: [{ id, name, nameKey, description: input.description ?? null }],
      skipDuplicates: true,
    });
    if (count === 0) {
      throw new GuildError("NAME_TAKEN");
    }

    const joined = await tx.guildMember.createMany({
      data: [{ guildId: id, userId, role: "OWNER" }],
      skipDuplicates: true,
    });

    if (joined.count === 0) {
      throw new GuildError("ALREADY_IN_GUILD");
    }

    return { id };
  });
}

export async function updateGuild(
  actorId: string,
  guildId: string,
  input: UpdateGuildInput,
) {
  const actor = await prisma.guildMember.findunique({
    where: {
      guildId_userId: { guildId, userId: actorId },
    },
  });
  if (!actor) throw new GuildError("FORBIDDEN");

  if (input.description !== undefined && !canEditProfile(actor.role)) {
    throw new GuildError("FORBIDDEN");
  }
  if (input.announcement !== undefined && !canEditAnnouncement(actor.role)) {
    throw new GuildError("FORBIDDEN");
  }

  await prisma.guild.update({
    where: { id: guildId },
    data: {
      ...(input.description !== undefined && {
        description: input.description || null,
      }),
      ...(input.announcement !== undefined && {
        announcement: input.announcement || null,
        announcementUpdatedAt: new Date(),
      }),
    },
  });
}

export async function disbandGuild(actorId: string, guildId: string) {
  return prisma.$transaction(async (tx) => {
    await lockGuild(tx, guildId);

    const actor = await getMember(tx, guildId, actorId);
    if (!actor || !canManageRoles(actor.role)) {
      throw new GuildError("FORBIDDEN");
    }

    const guild = await tx.guild.findUniqueOrThrow({
      where: { id: guildId },
      select: { name: true },
    });
    const others = await tx.guildMember.findMany({
      where: { guildId, userId: { not: actorId } },
      select: { userId: true },
    });

    for (const member of others) {
      await notify(tx, {
        userId: member.userId,
        type: "GUILD_DISBANDED",
        data: { guildName: guild.name },
      });
    }
    await tx.guild.delete({
      where: { id: guildId },
    });
  });
}

export async function requestToJoin(
  userId: string,
  guildId: string,
  message?: string,
) {
  return prisma.$transaction(async (tx) => {
    const membership = await tx.guildMember.findUnique({
      where: { userId },
    });

    if (membership) {
      throw new GuildError("ALREADY_IN_GUILD");
    }

    const guild = await tx.guild.findUnique({
      where: {
        id: guildId,
      },
      select: {
        name: true,
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    if (!guild) {
      throw new GuildError("GUILD_NOT_FOUND");
    }

    if (guild._count.members >= MAX_GUILD_MEMBERS) {
      throw new GuildError("GUILD_FULL");
    }

    const pending = await tx.guildJoinRequest.count({
      where: { userId },
    });

    if (pending >= MAX_PENDING_REQUESTS) {
      throw new GuildError("TOO_MANY_REQUESTS");
    }

    const { count } = await tx.guildJoinRequest.createMany({
      data: [{ guildId, userId, message: message ?? null }],
      skipDuplicates: true,
    });

    if (count === 0) throw new GuildError("ALREADY_REQUESTED");

    const fromName = await userName(tx, userId);

    for (const reviewerId of await reviewerIds(tx, guildId)) {
      await notify(tx, {
        userId: reviewerId,
        type: "GUILD_JOIN_REQUEST",
        data: { guildId, guildName: guild.name, fromName },
      });
    }
  });
}

export async function cancelRequest(userId: string, guildId: string) {
  const { count } = await prisma.guildJoinRequest.deleteMany({
    where: { guildId, userId },
  });
  if (count === 0) throw new GuildError("REQUEST_NOT_FOUND");
}

export async function approveRequest(
  actorId: string,
  guildId: string,
  applicantId: string,
) {
  return prisma.$transaction(async (tx) => {
    await lockGuild(tx, guildId);

    const actor = await getMember(tx, guildId, actorId);
    if (!actor || !canReviewRequests(actor.role)) {
      throw new GuildError("FORBIDDEN");
    }

    const claimed = await tx.guildJoinRequest.deleteMany({
      where: { guildId, userId: applicantId },
    });

    if (claimed.count === 0) {
      throw new GuildError("REQUEST_NOT_FOUND");
    }

    // count guild members + applicantId, if full the this  transaction will be null and the join Request will be auto ccancel

    const size = await tx.guildMember.count({
      where: {
        guildId,
      },
    });
    if (size >= MAX_GUILD_MEMBERS) {
      throw new GuildError("GUILD_FULL");
    }

    const { count } = await tx.guildMember.createMany({
      data: [{ guildId, userId: applicantId }],
      skipDuplicates: true,
    });
    if (count === 0) throw new GuildError("ALREADY_IN_GUILD");

    // if joinned guild, delete all the request from this person
    await tx.guildJoinRequest.deleteMany({
      where: { userId: applicantId },
    });

    const guild = await tx.guild.findUniqueOrThrow({
      where: { id: guildId },
      select: { name: true },
    });

    await notify(tx, {
      userId: applicantId,
      type: "GUILD_REQUEST_APPROVED",
      data: { guildId, guildName: guild.name },
    });
  });
}

export async function rejectRequest(
  actorId: string,
  guildId: string,
  applicantId: string,
) {
  return prisma.$transaction(async (tx) => {
    const actor = await getMember(tx, guildId, actorId);
    if (!actor || !canReviewRequests(actor.role))
      throw new GuildError("FORBIDDEN");

    // delete the join request to reject it
    const claimed = await tx.guildJoinRequest.deleteMany({
      where: { guildId, userId: applicantId },
    });

    if (claimed.count === 0) throw new GuildError("REQUEST_NOT_FOUND");

    const guild = await tx.guild.findUniqueOrThrow({
      where: { id: guildId },
      select: { name: true },
    });
    await notify(tx, {
      userId: applicantId,
      type: "GUILD_REQUEST_REJECTED",
      data: { guildId, guildName: guild.name },
    });
  });
}

export async function leaveGuild(userId: string) {
  return prisma.$transaction(async (tx) => {
    const found = await tx.guildMember.findUnique({
      where: { userId },
    });
    if (!found) throw new GuildError("NOT_A_MEMBER");

    await lockGuild(tx, found.guildId);

    const member = await getMember(tx, found.guildId, userId);
    if (!member) throw new GuildError("NOT_A_MEMBER");
    if (member.role === "OWNER") throw new GuildError("OWNER_CANNOT_LEAVE");

    await tx.guildMember.delete({
      where: { guildId_userId: { guildId: found.guildId, userId } },
    });
  });
}

export async function manageMember(
  actorId: string,
  guildId: string,
  targetId: string,
  action: MemberAction,
) {
  if (actorId === targetId) {
    throw new GuildError("INVALID_TARGET");
  }

  return prisma.$transaction(async (tx) => {
    await lockGuild(tx, guildId);

    const actor = await getMember(tx, guildId, actorId);
    if (!actor) throw new GuildError("FORBIDDEN");

    const target = await getMember(tx, guildId, targetId);
    if (!target) throw new GuildError("NOT_A_MEMBER");

    const guild = await tx.guild.findUniqueOrThrow({
      where: { id: guildId },
      select: { name: true },
    });

    if (action === "kick") {
      if (!canKick(actor.role as GuildRole, target.role as GuildRole)) {
        throw new GuildError("FORBIDDEN");
      }
      await tx.guildMember.delete({
        where: {
          guildId_userId: {
            guildId,
            userId: targetId,
          },
        },
      });

      await notify(tx, {
        userId: targetId,
        type: "GUILD_MEMBER_REMOVED",
        data: { guildName: guild.name },
      });
      return;
    }

    if (!canManageRoles(actor.role)) throw new GuildError("FORBIDDEN");

    if (action === "promote" || action === "demote") {
      if (target.role === "OWNER") throw new GuildError("INVALID_TARGET");

      const role = action === "promote" ? "MODERATOR" : "MEMBER";
      await tx.guildMember.update({
        where: { guildId_userId: { guildId, userId: targetId } },
        data: { role },
      });

      await notify(tx, {
        userId: targetId,
        type: "GUILD_ROLE_CHANGED",
        data: { guildId, guildName: guild.name, role },
      });
      return;
    }
    await tx.guildMember.update({
      where: { guildId_userId: { guildId, userId: targetId } },
      data: { role: "OWNER" },
    });
    await tx.guildMember.update({
      where: { guildId_userId: { guildId, userId: actorId } },
      data: { role: "MODERATOR" },
    });
    await notify(tx, {
      userId: targetId,
      type: "GUILD_ROLE_CHANGED",
      data: { guildId, guildName: guild.name, role: "OWNER" },
    });
  });
}

// bann user purpose
export async function removeUserFromGuilds(tx: Tx, userId: string) {
  await tx.guildJoinRequest.deleteMany({
    where: { userId },
  });

  const found = await tx.guildMember.findUnique({ where: { userId } });
  if (!found) return;

  await lockGuild(tx, found.guildId);

  const member = await getMember(tx, found.guildId, userId);

  if (!member) {
    return;
  }

  if (member.role !== "OWNER") {
    await tx.guildMember.delete({
      where: { guildId_userId: { guildId: found.guildId, userId } },
    });
    return;
  }

  const successor = await tx.guildMember.findFirst({
    where: { guildId: found.guildId, userId: { not: userId } },
    orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
  });

  if (!successor) {
    await tx.guild.delete({ where: { id: found.guildId } });
    return;
  }

  const guild = await tx.guild.findUniqueOrThrow({
    where: { id: found.guildId },
    select: { name: true },
  });
  await tx.guildMember.update({
    where: {
      guildId_userId: { guildId: found.guildId, userId: successor.userId },
    },
    data: { role: "OWNER" },
  });
  await tx.guildMember.delete({
    where: { guildId_userId: { guildId: found.guildId, userId } },
  });
  await notify(tx, {
    userId: successor.userId,
    type: "GUILD_ROLE_CHANGED",
    data: { guildId: found.guildId, guildName: guild.name, role: "OWNER" },
  });
}

export async function listGuilds(query: { q?: string; page: number }) {
  const where = query.q ? { nameKey: { contains: query.q.toLowerCase() } } : {};
  const [items, total] = await Promise.all([
    prisma.guild.findMany({
      where,
      include: {
        _count: { select: { members: true } },
        members: {
          where: {
            role: "OWNER",
          },
          select: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createAt: "desc",
      },
      skip: (query.page - 1) * GUILDS_PER_PAGE,
      take: GUILDS_PER_PAGE,
    }),
    prisma.guild.count({ where }),
  ]);

  return {
    items,
    total,
    page: query.page,
    totalPages: Math.ceil(total / GUILDS_PER_PAGE),
  };
}

export async function getMyGuild(userId:string){
  return prisma.guildMember.findUnique({
    where: { userId },
    include: {
      guild: { select: { id: true, name: true, _count: { select: { members: true } } } },
    },
  });
}

const ROLE_ORDER: Record<GuildRole, number> = { OWNER: 0, MODERATOR: 1, MEMBER: 2 };

export async function getGuildDetail(guildId:string,viewerId:string |null){
    const guild = await prisma.guild.findUnique({
    where: { id: guildId },
    include: { members: { include: { user: { select: { id: true, name: true } } } } },
  });

  if(!guild){
    return null
  }

  const members = [...guild.members].sort(
    (a, b) =>
      ROLE_ORDER[a.role as GuildRole] - ROLE_ORDER[b.role as GuildRole] ||
      a.joinedAt.getTime() - b.joinedAt.getTime(),
  );

  const viewerMember = viewerId?members.find((member)=>member.userId === viewerId):undefined
  const viewerRole =(viewerMember?.role as GuildRole |undefined) ?? null

  const requests =
    viewerRole && canReviewRequests(viewerRole)
      ? await prisma.guildJoinRequest.findMany({
          where: { guildId },
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: "asc" },
        })
      : [];

    let hasRequested= false;
    let inOtherGuild = false;
    if(viewerId && !viewerMember){
         const [request, membership] = await Promise.all([
      prisma.guildJoinRequest.findUnique({
        where: { guildId_userId: { guildId, userId: viewerId } },
      }),
      prisma.guildMember.findUnique({ where: { userId: viewerId } }),
    ]);
    hasRequested = request !== null;
    inOtherGuild = membership !== null;
    }

     return {
    guild: {
      id: guild.id,
      name: guild.name,
      description: guild.description,
      announcement: guild.announcement,
      announcementUpdatedAt: guild.announcementUpdatedAt,
      createdAt: guild.createdAt,
    },
    members: members.map((member) => ({
      userId: member.userId,
      name: member.user.name,
      role: member.role as GuildRole,
      joinedAt: member.joinedAt,
    })),
    requests: requests.map((request) => ({
      userId: request.userId,
      name: request.user.name,
      message: request.message,
      createdAt: request.createdAt,
    })),
    viewerRole,
    hasRequested,
    inOtherGuild,
  };
}
