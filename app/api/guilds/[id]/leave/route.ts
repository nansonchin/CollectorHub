import { guildErrorResponse } from "@/src/features/guilds/guilds.http";
import { leaveGuild } from "@/src/features/guilds/guilds.service";
import { getSession } from "@/src/lib/session";
import { NextResponse } from "next/server";

export async function POST(){
   const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    await leaveGuild(session.user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return guildErrorResponse(error);
  }
}