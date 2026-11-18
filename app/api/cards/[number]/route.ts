import { cardNumberSchema } from "@/src/features/cards/cards.schema";
import { getCardByNumber } from "@/src/features/cards/cards.service";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ number: string }> },
) {
  const { number } = await params;

  const parsed = cardNumberSchema.safeParse(number);

  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_CARD_NUMBER" }, { status: 400 });
  }

  try {
    const card = await getCardByNumber(parsed.data);
    if (!card) {
      return NextResponse.json({ error: "CARD_NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json(card);
  } catch (error) {
    console.error("GET /api/cards/[number] failed:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
