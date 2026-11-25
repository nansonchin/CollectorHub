import { expireStaleReservations } from "@/src/features/market/market.service";
import { pruneOldNotifications } from "@/src/features/notifications/notifications.service";
import { expireStaleQuests } from "@/src/features/quests/quests.service";
import { expireStaleTrades } from "@/src/features/trades/trades.service";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const expired = await expireStaleReservations();
    const expiredTrades = await expireStaleTrades()
    const quests = await expireStaleQuests();
    const prunedNotifications = await pruneOldNotifications();
    
    return NextResponse.json({ expired, expiredTrades, quests, prunedNotifications });
  } catch (error) {
    console.error("Cron expire-reservations failed:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
