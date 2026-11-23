import { NextResponse } from "next/server";
import { ModerationError, ModerationErrorCode } from "./moderation.service";

const STATUS_BY_CODE: Record<ModerationErrorCode, number> = {
  TARGET_NOT_FOUND: 404,
  REPORT_NOT_FOUND: 404,
  CANNOT_REPORT_SELF: 400,
  MESSAGE_REQUIRED: 400,
  INVALID_ACTION: 400,
  ACTION_NOT_ALLOWED: 403,
  ALREADY_REPORTED: 409,
  REPORT_ALREADY_HANDLED: 409,
  NOT_BANNED: 409,
  REPORT_LIMIT: 429, // Too Many Requests
};

export function moderationErrorResponse(error: unknown) {
  if (error instanceof ModerationError) {
    return NextResponse.json(
      { error: error.code },
      { status: STATUS_BY_CODE[error.code] },
    );
  }

  console.error("Moderation request failed:", error);
  return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
}
