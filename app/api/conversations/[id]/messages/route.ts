import { messageErrorResponse } from "@/src/features/messages/message.http";
import { listMessages, sendMessage, toClientMessage } from "@/src/features/messages/message.service";
import { sendMessageSchema } from "@/src/features/messages/messages.schema";
import { getSession } from "@/src/lib/session";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const { id } = await params;
  const afterParam = new URL(request.url).searchParams.get("after");
  let after: Date | undefined;
  if (afterParam) {
    after = new Date(afterParam);
    if (Number.isNaN(after.getTime())) {
      return NextResponse.json({ error: "INVALID_QUERY" }, { status: 400 });
    }
  }

  try {
    const messages = await listMessages(session.user.id, id, { after });
    return NextResponse.json({ messages });
  } catch (error) {
    return messageErrorResponse(error);
  }
}

export async function POST( request: Request,
  { params }: { params: Promise<{ id: string }> },) {
      const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const parsed = sendMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const { id } = await params;

  try {
    const message = await sendMessage(session.user.id, id, parsed.data);
    return NextResponse.json({ message: toClientMessage(message) }, { status: 201 });
  } catch (error) {
    return messageErrorResponse(error);
  }
}
