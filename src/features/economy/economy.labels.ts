export type LedgerTypeName =
  | "SIGNUP_BONUS"
  | "DAILY_LOGIN"
  | "QUEST_REWARD"
  | "SALE_INCOME"
  | "PURCHASE"
  | "FEE"
  | "TOP_UP"
  | "TRADE_GOLD"
  | "GUILD_CREATION";

export const LEDGER_LABELS: Record<LedgerTypeName, string> = {
  SIGNUP_BONUS: "Welcome bonus",
  DAILY_LOGIN: "Daily login bonus",
  QUEST_REWARD: "Quest reward",
  SALE_INCOME: "Card sale",
  PURCHASE: "Card purchase",
  FEE: "Market fee",
  TOP_UP: "Top-up",
  TRADE_GOLD: "Trade",
  GUILD_CREATION: "Guild creation",
};
