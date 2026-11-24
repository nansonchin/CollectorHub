import { questErrorResponse } from "@/src/features/quests/Quests.http";
import { createQuest } from "@/src/features/quests/Quests.service";
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
    const parsed = createQuestSchema.safeParse(body);
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
    const quest = await createQuest(session.user.id, parsed.data);
    return NextResponse.json({ id: quest.id }, { status: 201 });
  } catch (error) {
    return questErrorResponse(error);
  }
}