import { NextResponse } from "next/server";
import { MessageError, MessageErrorCode } from "./message.service";

const STATUS_BY_CODE: Record<MessageErrorCode, number> = {
  USER_NOT_FOUND: 404,
  CONVERSATION_NOT_FOUND: 404,
  CANNOT_MESSAGE_SELF: 400,
  INVALID_CARD: 400,
  RECIPIENT_UNAVAILABLE: 409,
  MESSAGE_RATE_LIMIT: 429, // Too Many Requests
};

export function messageErrorResponse(error: unknown) {
  if (error instanceof MessageError) {
    return NextResponse.json({ error: error.code }, { status: STATUS_BY_CODE[error.code] });
  }

  console.error("Message request failed:", error);
  return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
}
