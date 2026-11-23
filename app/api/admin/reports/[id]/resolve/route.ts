import { moderationErrorResponse } from "@/src/features/moderation/moderation.http";
import { resolveReportSchema } from "@/src/features/moderation/moderation.schema";
import { resolveReport } from "@/src/features/moderation/moderation.service";
import { isStaff } from "@/src/lib/authz";
import { getSession } from "@/src/lib/session";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
){
    const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  if (!isStaff(session.user.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
    let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
   const parsed = resolveReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const { id } = await params;

  try {
    await resolveReport(
      { id: session.user.id, role: session.user.role },
      id,
      parsed.data,
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return moderationErrorResponse(error);
  }
}

