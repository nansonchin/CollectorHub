import { messageErrorResponse } from "@/src/features/messages/message.http";
import { getOrCreateDirectConversation } from "@/src/features/messages/message.service";
import { createConversationSchema } from "@/src/features/messages/messages.schema";
import { getSession } from "@/src/lib/session";
import { NextResponse } from "next/server";

export async function POST(request:Request){
    const session = await getSession()

      if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const parsed = createConversationSchema.safeParse(body);
   if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
    try {
    const id = await getOrCreateDirectConversation(session.user.id, parsed.data.userId);
    return NextResponse.json({ id });
  } catch (error) {
    return messageErrorResponse(error);
  }
}