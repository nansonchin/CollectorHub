import { messageErrorResponse } from "@/src/features/messages/message.http";
import { markConversationRead } from "@/src/features/messages/message.service";
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
    await markConversationRead(session.user.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return messageErrorResponse(error);
  }
}
