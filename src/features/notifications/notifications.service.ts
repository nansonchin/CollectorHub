import { Prisma } from "@/generated/prisma/client";
import { Tx } from "../economy/wallet.service";
import { prisma } from "@/src/lib/prisma";

type NotificationType = Prisma.NotificationUncheckedCreateInput["type"];

type Db= Pick<Tx, "notification"|"user"|"card">

export async function notify(
    db:Db,
    input:{
        userId:string,
        type:NotificationType,
        data?:Record<string,string|number>
    }
){
    await db.notification.create({
          data: { userId: input.userId, type: input.type, data: input.data ?? {},} 
    })

}

export async function userName(db:Db,userId:string){
    const user = await db.user.findUnique({
        where:{id:userId,},
        select:{
            name:true,
        }
    })
    return user?.name??"Someone"
}

export async function cardName(db: Db, cardId: string) {
  const card = await db.card.findUnique({ where: { id: cardId }, select: { name: true } });
  return card?.name ?? "a card";
}

export async function countUnread(userId: string) {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

export async function listNotifications(userId: string, take = 50) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function markAllRead(userId: string) {
  const { count } = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return count;
}

export async function pruneOldNotifications() {
  const day = 24 * 60 * 60 * 1000;
  const now = Date.now();

  const { count } = await prisma.notification.deleteMany({
    where: {
      OR: [
        { readAt: { not: null }, createdAt: { lt: new Date(now - 30 * day) } },
        { createdAt: { lt: new Date(now - 90 * day) } },
      ],
    },
  });
  return count;
}