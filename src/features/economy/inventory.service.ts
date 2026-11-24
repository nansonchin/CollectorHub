import { Tx } from "./wallet.service";

export async function lockCopies(
  tx: Tx,
  userId: string,
  cardId: string,
  quantity: number,
) {
  const updated = await tx.$executeRaw`
        UPDATE "InventoryItem"
          SET "reservedQuantity" = "reservedQuantity" + ${quantity}::int, "updatedAt" = NOW()
    WHERE "userId" = ${userId} AND "cardId" = ${cardId}
      AND "quantity" - "reservedQuantity" >= ${quantity}::int
    `;
  return updated === 1;
}

export async function unlockCopies(
  tx: Tx,
  userId: string,
  cardId: string,
  quantity: number,
) {
  await tx.inventoryItem.update({
    where: { userId_cardId: { userId, cardId } },
    data: { reservedQuantity: { decrement: quantity } },
  });
}

export async function takeLockedCopies(
  tx: Tx,
  userId: string,
  cardId: string,
  quantity: number,
) {
  const updated = await tx.$executeRaw`
    UPDATE "InventoryItem"
    SET "quantity" = "quantity" - ${quantity}::int,
        "reservedQuantity" = "reservedQuantity" - ${quantity}::int,
        "updatedAt" = NOW()
    WHERE "userId" = ${userId} AND "cardId" = ${cardId}
      AND "reservedQuantity" >= ${quantity}::int
  `;
  return updated === 1;
}

export async function takeAvailableCopies(
  tx: Tx,
  userId: string,
  cardId: string,
  quantity: number,
) {
  const updated = await tx.$executeRaw`
    UPDATE "InventoryItem"
    SET "quantity" = "quantity" - ${quantity}::int, "updatedAt" = NOW()
    WHERE "userId" = ${userId} AND "cardId" = ${cardId}
      AND "quantity" - "reservedQuantity" >= ${quantity}::int
  `;
  return updated === 1;
}

export async function giveCopies(
  tx: Tx,
  userId: string,
  cardId: string,
  quantity: number,
) {
  await tx.inventoryItem.upsert({
    where: { userId_cardId: { userId, cardId } },
    create: { userId, cardId, quantity },
    update: { quantity: { increment: quantity } },
  });
}

export async function lockInventoryRows(tx:Tx,userIds:string[],cardIds: string[]){
    await tx.$queryRaw`
    SELECT "id" FROM "InventoryItem"
    WHERE "userId" = ANY(${[...new Set(userIds)]}::text[])
      AND "cardId" = ANY(${[...new Set(cardIds)]}::text[])
    ORDER BY "userId", "cardId"
    FOR UPDATE
  `;
}