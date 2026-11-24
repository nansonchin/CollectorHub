import { NextResponse } from "next/server";
import { TradeError, TradeErrorCode } from "./trades.service";

const STATUS_BY_CODE: Record<TradeErrorCode, number> = {
  RECIPIENT_NOT_FOUND: 404,
  TRADE_NOT_FOUND: 404,
  INVALID_CARD: 400,
  CANNOT_TRADE_WITH_SELF: 400,
  TOO_MANY_OPEN_TRADES: 409,
  NOT_ENOUGH_COPIES: 409,
  INSUFFICIENT_FUNDS: 409,
  TRADE_NOT_AVAILABLE: 409,
};

export function tradeErrorResponse(error: unknown) {
  if (error instanceof TradeError) {
    return NextResponse.json({ error: error.code }, { status: STATUS_BY_CODE[error.code] });
  }

  console.error("Trade request failed:", error);
  return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
}