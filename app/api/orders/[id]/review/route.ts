import { createReviewSchema } from "@/src/features/reviews/reviews.schema";
import { createReview, ReviewError } from "@/src/features/reviews/reviews.service";
import { getSession } from "@/src/lib/session";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
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

  const parsed = createReviewSchema.safeParse(body);
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

  const { id } = await params;

  try {
    await createReview(session.user.id, id, parsed.data);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof ReviewError) {
      const status = error.code === "ORDER_NOT_FOUND" ? 404 : 409;
      return NextResponse.json({ error: error.code }, { status });
    }
    console.error("POST /api/orders/[id]/review failed:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}