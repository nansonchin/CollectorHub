import { guildErrorResponse } from "@/src/features/guilds/guilds.http";
import { joinRequestSchema } from "@/src/features/guilds/guilds.schema";
import { cancelRequest, requestToJoin } from "@/src/features/guilds/guilds.service";
import { getSession } from "@/src/lib/session";
import { NextResponse } from "next/server";

// request to join the guild
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsed = joinRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const { id } = await params;

  try {
    await requestToJoin(session.user.id, id, parsed.data.message);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return guildErrorResponse(error);
  }
}

// cancel request to join the guild
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
    await cancelRequest(session.user.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return guildErrorResponse(error);
  }
}
