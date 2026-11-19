import { marketErrorResponse } from "@/src/features/market/market.http";
import { cancelListing } from "@/src/features/market/market.service";
import { getSession } from "@/src/lib/session";
import { NextResponse } from "next/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const { id } = await params;

  try {
    await cancelListing(session.user.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return marketErrorResponse(error);
  }
}
