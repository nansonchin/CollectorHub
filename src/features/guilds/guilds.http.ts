import { NextResponse } from "next/server";
import { GuildError, GuildErrorCode } from "./guilds.service";

const STATUS_BY_CODE: Record<GuildErrorCode, number> = {
  NAME_TAKEN: 409,
  ALREADY_IN_GUILD: 409,
  INSUFFICIENT_FUNDS: 409,
  GUILD_FULL: 409,
  TOO_MANY_REQUESTS: 409,
  ALREADY_REQUESTED: 409,
  OWNER_CANNOT_LEAVE: 409,
  GUILD_NOT_FOUND: 404,
  REQUEST_NOT_FOUND: 404,
  NOT_A_MEMBER: 404,
  FORBIDDEN: 403,
  INVALID_TARGET: 400,
};

export function guildErrorResponse(error: unknown) {
  if (error instanceof GuildError) {
    return NextResponse.json({ error: error.code }, { status: STATUS_BY_CODE[error.code] });
  }

  console.error("Guild request failed:", error);
  return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
}