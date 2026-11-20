export const GOLD_PACK_IDS = ["pouch", "chest", "vault"] as const;
export type GoldPackIds = (typeof GOLD_PACK_IDS)[number];

export const GOLD_PACKS: Record<
  GoldPackIds,
  { label: string; gold: number; priceCents: number }
> = {
  pouch: { label: "Pouch", gold: 500, priceCents: 99 },
  chest: { label: "Chest", gold: 1200, priceCents: 199 },
  vault: { label: "Vault", gold: 3500, priceCents: 499 },
};

export const TEST_CARD_NUMBERS = [
  "4242424242424242",
  "4000000000000002",
  "4000000000009995",
] as const;

export type TestCardNumber = (typeof TEST_CARD_NUMBERS)[number];
export const TEST_CARDS: Record<
  TestCardNumber,
  {
    label: string;
    hint: string;
    outcome: "success" | "declined" | "insufficient_funds";
  }
> = {
  "4242424242424242": {
    label: "4242 4242 4242 4242",
    hint: "Always succeeds",
    outcome: "success",
  },
  "4000000000000002": {
    label: "4000 0000 0000 0002",
    hint: "Card is declined",
    outcome: "declined",
  },
  "4000000000009995": {
    label: "4000 0000 0000 9995",
    hint: "Insufficient funds",
    outcome: "insufficient_funds",
  },
};

export const PENDING_TIMEOUT_MS = 2 * 60 * 1000;
