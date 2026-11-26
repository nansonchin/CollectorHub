import { guildErrorResponse } from "@/src/features/guilds/guilds.http";
import { updateGuildSchema } from "@/src/features/guilds/guilds.schema";
import { disbandGuild, updateGuild } from "@/src/features/guilds/guilds.service";
import { getSession } from "@/src/lib/session";
import { NextResponse } from "next/server";

// update announcement or description
export async function PATCH(
    request:Request,
    {params}:{params:Promise<{id:string}>}
){
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

  const parsed = updateGuildSchema.safeParse(body);

   if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const { id } = await params;

  try {
    await updateGuild(session.user.id, id, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return guildErrorResponse(error);
  }
}

//disband Guild
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
    await disbandGuild(session.user.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return guildErrorResponse(error);
  }
}