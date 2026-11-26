import { guildErrorResponse } from "@/src/features/guilds/guilds.http";
import { requestActionSchema } from "@/src/features/guilds/guilds.schema";
import { approveRequest, rejectRequest } from "@/src/features/guilds/guilds.service";
import { getSession } from "@/src/lib/session";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
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

  const parsed = requestActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const { id, userId } = await params;

  try{

    if(parsed.data.action === "approve"){
      await approveRequest(session.user.id,id,userId)
    }else{
      await rejectRequest(session.user.id,id,userId)
    }

    return NextResponse.json({
      ok:true
    })
  }catch(error){
    return guildErrorResponse(error)
  }
}

