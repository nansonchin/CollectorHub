import { guildErrorResponse } from "@/src/features/guilds/guilds.http";
import { createGuildSchema } from "@/src/features/guilds/guilds.schema";
import { createGuild } from "@/src/features/guilds/guilds.service";
import { getSession } from "@/src/lib/session";
import { NextResponse } from "next/server";

// create Guild
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  let body:unknown;

  try{
    body= await request.json()
  }catch(error){
        return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const parsed = createGuildSchema.safeParse(body)
  if(!parsed.success){

     return NextResponse.json(
      {
        error: "INVALID_BODY",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  try {
    const guild = await createGuild(session.user.id, parsed.data);
    return NextResponse.json({ id: guild.id }, { status: 201 });
  } catch (error) {
    return guildErrorResponse(error);
  }

}
