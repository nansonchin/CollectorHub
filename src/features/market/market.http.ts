import { NextResponse } from "next/server";
import { MarketError, MarketErrorCode } from "./market.service";

const STATUS_BY_CODE: Record<MarketErrorCode, number> = {
  NOT_ENOUGH_COPIES: 409,
  LISTING_NOT_FOUND: 404,
  LISTING_NOT_CANCELLABLE: 409,
  LISTING_NOT_AVAILABLE: 409,
  LISTING_RESERVED: 409,
  CANNOT_BUY_OWN_LISTING: 409,
  INSUFFICIENT_FUNDS: 409,
  RESERVATION_LIMIT: 409,
  RESERVATION_NOT_FOUND: 404,
  RESERVATION_NOT_CANCELLABLE: 409,
};

export function marketErrorResponse(error: unknown) {
  if (error instanceof MarketError) {
    return NextResponse.json(
      { error: error.code },
      { status: STATUS_BY_CODE[error.code] },
    );
  }
   console.error("Market request failed:", error);
  return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
}
