import { NextResponse } from "next/server";
import { QuestError, QuestErrorCode } from "./quests.service";

const STATUS_BY_CODE: Record<QuestErrorCode, number> = {
  INVALID_CARD: 400,
  QUEST_NOT_FOUND: 404,
  TOO_MANY_OPEN_QUESTS: 409,
  TOO_MANY_ACCEPTED: 409,
  INSUFFICIENT_FUNDS: 409,
  NOT_ENOUGH_COPIES: 409,
  QUEST_NOT_AVAILABLE: 409,
  CANNOT_ACCEPT_OWN: 409,
};

export function questErrorResponse(error: unknown) {
  if (error instanceof QuestError) {
    return NextResponse.json({ error: error.code }, { status: STATUS_BY_CODE[error.code] });
  }

  console.error("Quest request failed:", error);
  return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
}
