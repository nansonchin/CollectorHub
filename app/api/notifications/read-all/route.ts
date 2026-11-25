import { markAllRead } from "@/src/features/notifications/notifications.service";
import { getSession } from "@/src/lib/session";
import { NextResponse } from "next/server";

export async function POST() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const marked = await markAllRead(session.user.id);
     return NextResponse.json({ marked });
  } catch (error) {
    console.error("POST /api/notifications/read-all failed:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
