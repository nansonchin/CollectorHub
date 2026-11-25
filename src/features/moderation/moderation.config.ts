export const REPORT_REASON_IDS = [
  "SPAM",
  "MISLEADING",
  "HARASSMENT",
  "OTHER",
] as const;

export type ReportReasonId = (typeof REPORT_REASON_IDS)[number];

export const REPORT_REASON_LABELS: Record<ReportReasonId, string> = {
  SPAM: "Spam",
  MISLEADING: "Misleading information",
  HARASSMENT: "Harassment or abuse",
  OTHER: "Something else",
};

export const REPORT_TARGET_TYPES = ["LISTING", "USER", "REVIEW", "MESSAGE"] as const;
export type ReportTargetTypeId = (typeof REPORT_TARGET_TYPES)[number];

export const MAX_REPORT_DETAILS = 500;
export const MAX_ADMIN_TEXT = 300;

export const MAX_REPORTS_PER_DAY = 10;

export const RESOLVE_ACTION_IDS = [
  "DISMISS",
  "REMOVE_LISTING",
  "HIDE_REVIEW",
  "WARN_USER",
  "BAN_USER",
] as const;
export type ResolveActionId = (typeof RESOLVE_ACTION_IDS)[number];

export const RESOLVE_ACTION_LABELS: Record<ResolveActionId, string> = {
  DISMISS: "Dismiss (no action needed)",
  REMOVE_LISTING: "Remove the listing",
  HIDE_REVIEW: "Hide the review",
  WARN_USER: "Warn the player",
  BAN_USER: "Ban the player",
};