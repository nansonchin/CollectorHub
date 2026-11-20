import { marketErrorResponse } from "@/src/features/market/market.http";
import { reserveListing } from "@/src/features/market/market.service";
import { getSession } from "@/src/lib/session";
import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const { id } = await params;

  try {
    const reservation = await reserveListing(session.user.id, id);
    return NextResponse.json(
      { reservationId: reservation.id, expiresAt: reservation.expiresAt },
      { status: 201 },
    );
  } catch (error) {
    return marketErrorResponse(error);
  }
  
}
