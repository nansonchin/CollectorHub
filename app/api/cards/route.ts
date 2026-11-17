import { listCardsQuerySchema } from "@/src/features/cards/cards.schema";
import { listCards } from "@/src/features/cards/cards.service";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const raw = Object.fromEntries(
    [...request.nextUrl.searchParams.entries()].filter(
      ([, value]) => value !== "",
    ),
  );

  const parsed = listCardsQuerySchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "INVALID_QUERY",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  try{
    const result = await listCards(parsed.data)
    return NextResponse.json(result);

  }catch(error){
     console.error("GET /api/cards failed:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
