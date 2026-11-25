import { prisma } from "@/src/lib/prisma";
import { SendMessageInput } from "./messages.schema";
import { MAX_MESSAGES_PER_MINUTE, PREVIEW_LENGTH } from "./messages.config";

export type MessageErrorCode =
  | "USER_NOT_FOUND"
  | "CANNOT_MESSAGE_SELF"
  | "CONVERSATION_NOT_FOUND"
  | "RECIPIENT_UNAVAILABLE"
  | "MESSAGE_RATE_LIMIT"
  | "INVALID_CARD";

export class MessageError extends Error {
  constructor(public readonly code: MessageErrorCode) {
    super(code);
    this.name = "Message Error";
  }
}

const messageInclude = {
  sender: { select: { id: true, name: true } },
  card: { select: { id: true, name: true, number: true } },
} as const;

export function toClientMessage(message: {
  id: string;
  senderId: string;
  type: "TEXT" | "CARD" | "TRADE_INVITE";
  body: string | null;
  createdAt: Date;
  sender: { name: string };
  card: { id: string; name: string; number: number } | null;
}) {
  return {
    id: message.id,
    senderId: message.senderId,
    senderName: message.sender.name,
    type: message.type,
    body: message.body,
    createdAt: message.createdAt.toISOString(),
    card: message.card,
  };
}

async function requireMembership(userId: string, conversationId: string) {
  const member = await prisma.conversationMember.findUnique({
    where: {
      conversationId_userId: { conversationId, userId },
    },
  });

  if (!member) {
    throw new MessageError("CONVERSATION_NOT_FOUND");
  }

  return member;
}

export async function getOrCreateDirectConversation(
  userId: string,
  otherId: string,
) {
  if (otherId === userId) {
    throw new MessageError("CANNOT_MESSAGE_SELF");
  }

  const other = await prisma.user.findUnique({
    where: {
      id: otherId,
    },
  });
  if (!other || other.bannedAt) {
    throw new MessageError("USER_NOT_FOUND");
  }

  const [low, high] = [userId, otherId].sort();
  const directKey = `${low}:${high}`;

  const existing = await prisma.conversation.findUnique({
    where: { directKey },
  });
  if (existing) return existing.id;

  const id = crypto.randomUUID();

  await prisma.$transaction(async (tx) => {
    const { count } = await tx.conversation.createMany({
      data: [{ id, type: "DIRECT", directKey }],
      skipDuplicates: true,
    });
    if (count === 1) {
      await tx.conversationMember.createMany({
        data: [
          { conversationId: id, userId },
          { conversationId: id, userId: otherId },
        ],
      });
    }
  });
  const conversation = await prisma.conversation.findUniqueOrThrow({
    where: { directKey },
  });
  return conversation.id;
}

export async function sendMessage(
  senderId: string,
  conversationId: string,
  input: SendMessageInput,
) {
  await requireMembership(senderId, conversationId);

  const other = await prisma.conversationMember.findFirst({
    where: { conversationId, userId: { not: senderId } },
    include: { user: { select: { bannedAt: true } } },
  });
  if (!other || other.user.bannedAt)
    throw new MessageError("RECIPIENT_UNAVAILABLE");

  const recent = await prisma.message.count({
    where: { senderId, createdAt: { gte: new Date(Date.now() - 60_000) } },
  });

  if (recent >= MAX_MESSAGES_PER_MINUTE)
    throw new MessageError("MESSAGE_RATE_LIMIT");

  let body: string | null = null;
  let cardId: string | null = null;
  let preview: string;

  if (input.type === "TEXT") {
    body = input.body;
    preview = input.body.slice(0, PREVIEW_LENGTH);
  } else if (input.type === "CARD") {
    const card = await prisma.card.findUnique({
      where: { id: input.cardId },
      select: { id: true, name: true },
    });
    if (!card) throw new MessageError("INVALID_CARD");
    cardId = card.id;
    preview = `Shared a card: ${card.name}`;
  } else {
    preview = "Invited you to trade";
  }

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      UPDATE "Conversation"
      SET "lastMessageAt" = NOW(), "lastMessagePreview" = ${preview}
      WHERE "id" = ${conversationId}
      `;

    const message = await tx.message.create({
      data: { conversationId, senderId, type: input.type, body, cardId },
      include: messageInclude,
    });
    await tx.$executeRaw`
      UPDATE "ConversationMember"
      SET "unreadCount" = CASE WHEN "userId" = ${senderId} THEN 0 ELSE "unreadCount" + 1 END,
          "lastReadAt" = CASE WHEN "userId" = ${senderId} THEN NOW() ELSE "lastReadAt" END
      WHERE "conversationId" = ${conversationId}
    `;

    return message;
  });
}

export async function markConversationRead(
  userId: string,
  conversationId: string,
) {
  const updated = await prisma.$executeRaw`
        UPDATE "ConversationMember"
    SET "unreadCount" = 0, "lastReadAt" = NOW()
    WHERE "conversationId" = ${conversationId} AND "userId" = ${userId}
    `;

  if (updated === 0) throw new MessageError("CONVERSATION_NOT_FOUND");
}

export async function listMessages(
  userId: string,
  conversationId: string,
  options: { after?: Date } = {},
) {
  await requireMembership(userId, conversationId);

  if (options.after) {
    const messages = await prisma.message.findMany({
      where: { conversationId, createdAt: { gt: options.after } },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: 100,
      include: messageInclude,
    });
    return messages.map(toClientMessage);
  }

  const recent = await prisma.message.findMany({
    where: { conversationId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 50,
    include: messageInclude,
  });
  return recent.reverse().map(toClientMessage);
}

export async function getThread(userId: string, conversationId: string) {
  const member = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });

  if (!member) {
    return null;
  }

  const other = await prisma.conversationMember.findFirst({
    where: { conversationId, userId: { not: userId } },
    include: { user: { select: { id: true, name: true, bannedAt: true } } },
  });
  if (!other) return null;

  const messages = await listMessages(userId, conversationId);
  return {
    conversationId,
    other: {
      id: other.user.id,
      name: other.user.name,
      banned: other.user.bannedAt !== null,
    },
    messages,
  };
}

export async function listConversations(userId: string) {
  const memberships = await prisma.conversationMember.findMany({
    where: { userId, conversation: { lastMessageAt: { not: null } } },
    include: {
      conversation: {
        select: {
          lastMessageAt: true,
          lastMessagePreview: true,
          members: {
            where: { userId: { not: userId } },
            select: {
              user: { select: { id: true, name: true, bannedAt: true } },
            },
          },
        },
      },
    },
    orderBy: { conversation: { lastMessageAt: "desc" } },
    take: 50,
  });

  return memberships.map((member) => ({
    id: member.conversationId,
    unreadCount: member.unreadCount,
    lastMessageAt: member.conversation.lastMessageAt!,
    preview: member.conversation.lastMessagePreview ?? "",
    other: member.conversation.members[0]?.user ?? null,
  }));
}

export async function countUnreadMessages(userId: string) {
  const result = await prisma.conversationMember.aggregate({
    where: { userId },
    _sum: { unreadCount: true },
  });
  return result._sum.unreadCount ?? 0;
}
