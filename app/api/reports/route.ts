import { moderationErrorResponse } from "@/src/features/moderation/moderation.http";
import { createReportSchema } from "@/src/features/moderation/moderation.schema";
import { createReport } from "@/src/features/moderation/moderation.service";
import { getSession } from "@/src/lib/session";
import { NextResponse } from "next/server";

export async function POST(
    request:Request,
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
   const parsed = createReportSchema.safeParse(body);
  if (!parsed.success) {
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
    await createReport(session.user.id, parsed.data);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return moderationErrorResponse(error);
  }
}