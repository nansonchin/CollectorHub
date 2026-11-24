import { tradeErrorResponse } from "@/src/features/trades/trades.http";
import { cancelTrade } from "@/src/features/trades/trades.service";
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
    await cancelTrade(session.user.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return tradeErrorResponse(error);
  }
}
