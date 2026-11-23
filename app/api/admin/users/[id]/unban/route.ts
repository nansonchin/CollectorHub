import { moderationErrorResponse } from "@/src/features/moderation/moderation.http";
import { unBanUser } from "@/src/features/moderation/moderation.service";
import { isAdmin } from "@/src/lib/authz";
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
  if(!isAdmin(session.user.role)){
     return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const {id} = await params;
   try {
    await unBanUser({ id: session.user.id, role: session.user.role }, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return moderationErrorResponse(error);
  }
}
