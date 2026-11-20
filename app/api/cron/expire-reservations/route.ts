import { expireStaleReservations } from "@/src/features/market/market.service";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const expired = await expireStaleReservations();
    return NextResponse.json({ expired });
  } catch (error) {
    console.error("Cron expire-reservations failed:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
