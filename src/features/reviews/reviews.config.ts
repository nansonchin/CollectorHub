export const REVIEW_TAG_IDS= ["FAST_TRADER", "GOOD_COMMUNICATION", "FAIR_PRICE"] as const;
export type ReviewTagId = (typeof REVIEW_TAG_IDS)[number];

export const REVIEW_TAG_LABELS: Record<ReviewTagId, string> = {
  FAST_TRADER: "Fast trader",
  GOOD_COMMUNICATION: "Good communication",
  FAIR_PRICE: "Fair price",
};

export const MAX_REVIEW_TAGS = 3;
export const MAX_COMMENT_LENGTH = 280;