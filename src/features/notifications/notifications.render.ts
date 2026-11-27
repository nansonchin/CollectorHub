import { Prisma } from "@/generated/prisma/client";

type NotificationType = Prisma.NotificationUncheckedCreateInput["type"];

export function describeNotification(
  type: NotificationType,
  rawData: unknown,
  userId: string,
): { title: string; body: string; href: string } {
  const data = (
    rawData && typeof rawData === "object" && !Array.isArray(rawData)
      ? rawData
      : {}
  ) as Record<string, unknown>;

  const text = (key: string, fallback = "") => {
    return data[key] === undefined || data[key] === null
      ? fallback
      : String(data[key]);
  };
  const gold = (key: string) => Number(data[key] ?? 0).toLocaleString("en-US");

  switch (type) {
    case "TRADE_OFFER_RECEIVED":
      return {
        title: "New trade offer",
        body: `${text("fromName", "Someone")} sent you a trade offer.`,
        href: "/trades",
      };
    case "TRADE_ACCEPTED":
      return {
        title: "Trade completed",
        body: `${text("byName", "Someone")} accepted your offer. The cards and Gold have been swapped.`,
        href: "/trades",
      };
    case "TRADE_REJECTED":
      return {
        title: "Offer declined",
        body: `${text("byName", "Someone")} declined your offer. Your cards and Gold are available again.`,
        href: "/trades",
      };
    case "TRADE_CANCELLED":
      return {
        title: "Offer withdrawn",
        body: `${text("byName", "Someone")} withdrew their trade offer.`,
        href: "/trades",
      };
    case "TRADE_EXPIRED":
      return {
        title: "Offer expired",
        body: `Your offer to ${text("toName", "a player")} expired. Your cards and Gold are available again.`,
        href: "/trades",
      };
    case "QUEST_ACCEPTED":
      return {
        title: "Quest accepted",
        body: `${text("byName", "Someone")} accepted your quest for ${text("quantity")}× ${text("cardName")}.`,
        href: "/quests",
      };
    case "QUEST_DELIVERED":
      return {
        title: "Quest completed",
        body: `${text("byName", "Someone")} delivered ${text("quantity")}× ${text("cardName")}. ${gold("reward")} Gold was paid out.`,
        href: "/quests",
      };
    case "QUEST_REOPENED":
      return {
        title: "Quest open again",
        body:
          text("reason") === "timed_out"
            ? `${text("byName", "The player")} didn't deliver in time. Your quest for ${text("quantity")}× ${text("cardName")} is open again.`
            : `${text("byName", "The player")} gave up your quest for ${text("quantity")}× ${text("cardName")}. It is open again.`,
        href: "/quests",
      };
    case "QUEST_HOLD_EXPIRED":
      return {
        title: "Quest time ran out",
        body: `You didn't deliver ${text("quantity")}× ${text("cardName")} in time. The quest is open to everyone again.`,
        href: "/quests",
      };
    case "QUEST_EXPIRED":
      return {
        title: "Quest expired",
        body: `Your quest for ${text("quantity")}× ${text("cardName")} expired. ${gold("reward")} Gold was returned to you.`,
        href: "/quests",
      };
    case "LISTING_SOLD":
      return {
        title: "Card sold",
        body: `${text("buyerName", "Someone")} bought ${text("quantity")}× ${text("cardName")}. You received ${gold("net")} Gold after the fee.`,
        href: "/orders",
      };
    case "LISTING_RESERVED":
      return {
        title: "Listing reserved",
        body: `Someone reserved your listing for ${text("cardName")}. They have 24 hours to buy it.`,
        href: "/inventory",
      };
    case "RESERVATION_EXPIRED":
      return {
        title: "Reservation expired",
        body: `Your reservation of ${text("cardName")} ran out. The listing is open to everyone again.`,
        href: "/market",
      };
    case "REVIEW_RECEIVED":
      return {
        title: "New review",
        body: `${text("reviewerName", "Someone")} gave you ${text("rating")} ${text("rating") === "1" ? "star" : "stars"}.`,
        href: `/players/${userId}`,
      };
    case "MODERATION_WARNING":
      return {
        title: "Warning from moderators",
        body: text("message", "A moderator sent you a warning."),
        href: "/account",
      };
    case "GUILD_JOIN_REQUEST":
      return {
        title: "Guild join request",
        body: `${text("fromName", "Someone")} asked to join ${text("guildName", "your guild")}.`,
        href: `/guilds/${text("guildId")}`,
      };
      case "GUILD_REQUEST_APPROVED":
      return {
        title: "Welcome to the guild",
        body: `${text("guildName", "The guild")} accepted your request.`,
        href: `/guilds/${text("guildId")}`,
      };
    case "GUILD_REQUEST_REJECTED":
      return {
        title: "Request declined",
        body: `${text("guildName", "The guild")} declined your request to join.`,
        href: "/guilds",
      };
    case "GUILD_MEMBER_REMOVED":
      return {
        title: "Removed from guild",
        body: `You were removed from ${text("guildName", "your guild")}.`,
        href: "/guilds",
      };
    case "GUILD_ROLE_CHANGED": {
      const role = text("role");
      const what =
        role === "OWNER"
          ? "the owner"
          : role === "MODERATOR"
            ? "a moderator"
            : "a regular member";
      return {
        title: "Guild role changed",
        body: `You are now ${what} of ${text("guildName", "your guild")}.`,
        href: `/guilds/${text("guildId")}`,
      };
    }
    case "GUILD_DISBANDED":
      return {
        title: "Guild disbanded",
        body: `${text("guildName", "Your guild")} was disbanded by its owner.`,
        href: "/guilds",
      };
  }
}
