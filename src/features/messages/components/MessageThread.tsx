import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { MAX_MESSAGE_LENGTH, POLL_INTERVAL_MS, POLL_OVERLAP_MS } from "../messages.config";
import { formatCardNumber } from "../../cards/cards.meta";
import { ReportDialog } from "../../moderation/components/ReportDialog";
import Link from "next/link";

export type ClientMessage = {
  id: string;
  senderId: string;
  senderName: string;
  type: "TEXT" | "CARD" | "TRADE_INVITE";
  body: string | null;
  createdAt: string;
  card: { id: string; name: string; number: number } | null;
};

type Props = {
  conversationId: string;
  viewerId: string;
  other: { id: string; name: string; banned: boolean };
  initialMessages: ClientMessage[];
  cards: { id: string; name: string; number: number }[];
};

const ERROR_MESSAGES: Record<string, string> = {
  MESSAGE_RATE_LIMIT:
    "You're sending messages too fast. Wait a moment and try again.",
  RECIPIENT_UNAVAILABLE: "This player can't receive messages right now.",
  INVALID_CARD: "That card is not valid.",
  INVALID_BODY: "Write a message first (up to 1000 characters).",
  CONVERSATION_NOT_FOUND: "This conversation could not be found.",
  UNAUTHORIZED: "Your session has expired. Please sign in again.",
};

const byTime = (a: ClientMessage, b: ClientMessage) =>
  a.createdAt === b.createdAt
    ? a.id.localeCompare(b.id)
    : a.createdAt < b.createdAt
      ? -1
      : 1;

export function MessageThread({
  conversationId,
  viewerId,
  other,
  initialMessages,
  cards,
}: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const [cardId, setCardId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const seen = useRef(new Set(initialMessages.map((m) => m.id)));

  const cursor = useRef<string | null>(
    initialMessages.at(-1)?.createdAt ?? null,
  );

  const bottomRef = useRef<HTMLDivElement>(null);

  const merge = useCallback((incoming: ClientMessage[]) => {
    const fresh = incoming.filter((message) => !seen.current.has(message.id));
    if (fresh.length === 0) {
      return [];
    }

    for (const message of fresh) seen.current.add(message.id);
    setMessages((current) => [...current, ...fresh].sort(byTime));

    const newest = fresh
      .map((m) => m.createdAt)
      .sort()
      .at(-1)!;
    if (!cursor.current || newest > cursor.current) cursor.current = newest;
    return fresh;
  }, []);

  const markRead = useCallback(async () => {
    await fetch(`/api/conversations/${conversationId}/read`, {
      method: "POST",
    });
    router.refresh();
  }, [conversationId, router]);

  const poll = useCallback(async () => {
    const after = cursor.current
      ? new Date(
          new Date(cursor.current).getTime() - POLL_OVERLAP_MS,
        ).toISOString()
      : null;

    try {
      const response = await fetch(
        `/api/conversations/${conversationId}/messages${
          after ? `?after=${encodeURIComponent(after)}` : ""
        }`,
      );
      if (!response.ok) return;
      const body = await response.json();
      const fresh = merge(body.messages as ClientMessage[]);

      if (fresh.some((message) => message.senderId !== viewerId))
        await markRead();
    } catch {}
  }, [conversationId, merge, markRead, viewerId]);

  useEffect(() => {
    void markRead();

    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void poll();
    }, POLL_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") void poll();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [markRead, poll]);

  //   if got message move to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  async function send(
    payload:
      | { type: "TEXT"; body: string }
      | { type: "CARD"; cardId: string }
      | { type: "TRADE_INVITE" },
  ) {
    setError(null);
    setPending(true);

    try {
      const response = await fetch(
        `/api/conversations/${conversationId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        setError(
          ERROR_MESSAGES[body?.error as string] ??
            "Something went wrong. Please try again.",
        );
        return false;
      }

      merge([body.message as ClientMessage]);
      return true;
    } catch {
      setError(
        "Could not reach the server. Check your connection and try again.",
      );
      return false;
    } finally {
      setPending(false);
    }
  }
  async function handleSendText(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = text.trim();
    if (!body || pending) return;
    if (await send({ type: "TEXT", body })) setText("");
  }

  async function handleShareCard() {
    if (!cardId || pending) return;
    if (await send({ type: "CARD", cardId })) setCardId("");
  }

  const unavailable = other.banned;

   return (
    <div className="flex h-[calc(100vh-14rem)] min-h-[28rem] flex-col rounded-[32px] bg-white shadow-soft">
      <div
        className="flex-1 space-y-3 overflow-y-auto px-5 py-5"
        role="log"
        aria-live="polite"
        aria-label={`Conversation with ${other.name}`}
      >
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-mute">
            No messages yet. Say hello to {other.name}.
          </p>
        )}

        {messages.map((message) => {
          const mine = message.senderId === viewerId;
          return (
            <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                <div
                  className={`rounded-3xl px-4 py-2.5 text-sm ${
                    mine ? "bg-ink text-white" : "bg-paper text-ink"
                  }`}
                >
                  {message.type === "TEXT" && (
                    <p className="whitespace-pre-wrap break-words">{message.body}</p>
                  )}

                  {message.type === "CARD" && message.card && (
                    <p>
                      Shared a card:{" "}
                      <Link
                        href={`/collection?card=${message.card.number}`}
                        className="font-semibold underline underline-offset-2"
                      >
                        N°{formatCardNumber(message.card.number)} {message.card.name}
                      </Link>
                    </p>
                  )}

                  {message.type === "TRADE_INVITE" &&
                    (mine ? (
                      <p>You invited {other.name} to trade.</p>
                    ) : (
                      <p>
                        {message.senderName} invited you to trade.{" "}
                        <Link
                          href={`/trades/new?to=${message.senderId}`}
                          className="font-semibold underline underline-offset-2"
                        >
                          Propose a trade
                        </Link>
                      </p>
                    ))}
                </div>

                <div className="mt-1 flex items-center gap-3 px-2 text-xs text-mute">
                  <time dateTime={message.createdAt} suppressHydrationWarning>
                    {new Date(message.createdAt).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </time>
                  {!mine && (
                    <ReportDialog
                      targetType="MESSAGE"
                      targetId={message.id}
                      subject="this message"
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="space-y-3 border-t border-ink/10 px-5 py-4">
        {unavailable && (
          <p className="rounded-xl bg-paper px-4 py-3 text-sm text-mute">
            {other.name} is no longer available. You can still read this conversation.
          </p>
        )}

        {error && (
          <p
            role="alert"
            className="rounded-xl bg-[#FFE3D6] px-4 py-3 text-sm font-semibold text-[#B8441A]"
          >
            {error}
          </p>
        )}

        <form onSubmit={handleSendText} className="flex items-end gap-2">
          <label className="min-w-0 flex-1">
            <span className="sr-only">Message</span>
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                // Enter send, Shift + Enter to skip a line
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              maxLength={MAX_MESSAGE_LENGTH}
              rows={1}
              disabled={unavailable}
              placeholder={`Message ${other.name}`}
              className="max-h-32 w-full resize-none rounded-2xl bg-paper px-4 py-3 text-sm outline-none ring-1 ring-transparent focus:ring-ink disabled:opacity-50"
            />
          </label>
          <button
            type="submit"
            disabled={pending || unavailable || text.trim() === ""}
            className="h-11 shrink-0 rounded-full bg-ink px-6 text-sm font-semibold text-white hover:bg-ink/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-50"
          >
            Send
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <span className="sr-only">Card to share</span>
            <select
              value={cardId}
              onChange={(event) => setCardId(event.target.value)}
              disabled={unavailable}
              className="h-10 max-w-52 rounded-xl bg-paper px-3 text-sm outline-none ring-1 ring-transparent focus:ring-ink disabled:opacity-50"
            >
              <option value="">Share a card…</option>
              {cards.map((card) => (
                <option key={card.id} value={card.id}>
                  N°{formatCardNumber(card.number)} {card.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={handleShareCard}
            disabled={pending || unavailable || cardId === ""}
            className="h-10 rounded-full bg-paper px-4 text-sm font-semibold hover:bg-gold-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-50"
          >
            Share
          </button>
          <button
            type="button"
            onClick={() => void send({ type: "TRADE_INVITE" })}
            disabled={pending || unavailable}
            className="h-10 rounded-full bg-paper px-4 text-sm font-semibold hover:bg-gold-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-50"
          >
            Invite to trade
          </button>
        </div>
      </div>
    </div>
  );
}
