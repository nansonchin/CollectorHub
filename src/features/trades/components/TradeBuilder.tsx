"use client";

import { useRouter } from "next/navigation";
import { formatCardNumber } from "../../cards/cards.meta";
import { useState } from "react";

type CardOption = {
  cardId: string;
  name: string;
  number: number;
  available: number;
};

type Props = {
  recipient: { id: string; name: string };
  myCards: CardOption[];
  theirCards: CardOption[];
  myGold: number;
};

const ERROR_MESSAGES: Record<string, string> = {
  NOT_ENOUGH_COPIES:
    "You don't have enough available copies of one of the cards you offered.",
  INSUFFICIENT_FUNDS: "You don't have enough Gold to offer that amount.",
  TOO_MANY_OPEN_TRADES: "You have too many open offers. Cancel one first.",
  RECIPIENT_NOT_FOUND: "This player can't receive trade offers.",
  INVALID_CARD: "One of the cards is not valid.",
  INVALID_BODY: "Check the cards and amounts, then try again.",
  UNAUTHORIZED: "Your session has expired. Please sign in again.",
};

const inputClass =
  "h-10 w-full rounded-xl bg-paper px-3 text-center font-semibold outline-none ring-1 ring-transparent focus:ring-ink";

function CardColumn({
  title,
  hint,
  cards,
  quantities,
  onChange,
  emptyText,
}: {
  title: string;
  hint: string;
  cards: CardOption[];
  quantities: Record<string, number>;
  onChange: (cardId: string, quantity: number) => void;
  emptyText: string;
}) {
  return (
    <section
      aria-label={title}
      className="rounded-[28px] bg-white p-6 shadow-sofft"
    >
      <h2 className="font-display text-xl font-bold">{title}</h2>
      <p className="mt-1 text-sm text-mute">{hint}</p>
      {cards.length > 0 ? (
        <ul className="mt-4 max-h-96 space-y-2 overflow-y-auto pr-1">
          {cards.map((card) => (
            <li
              key={card.cardId}
              className="flex items-center gap-3 rounded-2xl bg-paper px-4 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{card.name}</p>
                <p className="text-xs text-mute">
                  N°{formatCardNumber(card.number)} · {card.available} available
                </p>
              </div>
              <label className="w-16">
                <span className="sr-only">Quantity of {card.name}</span>
                <input
                  type="number"
                  min={0}
                  max={card.available}
                  step={1}
                  value={quantities[card.cardId] ?? 0}
                  onChange={(event) => {
                    // 限制在 0 到可用数量之间；输入框里的值不可信，服务器还会再验证一遍
                    const value = Math.floor(Number(event.target.value) || 0);
                    onChange(
                      card.cardId,
                      Math.max(0, Math.min(card.available, value)),
                    );
                  }}
                  className={inputClass}
                />
              </label>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 rounded-2xl bg-paper px-4 py-6 text-center text-sm text-mute">
          {emptyText}
        </p>
      )}
    </section>
  );
}

export function TradeBuilder({
  recipient,
  myCards,
  theirCards,
  myGold,
}: Props) {
  const router = useRouter();
  const [offerQty, setOfferQty] = useState<Record<string, number>>({});
  const [requestQty, setRequestQty] = useState<Record<string, number>>({});
  const [offeredGold, setOfferedGold] = useState("");
  const [requestedGold, setRequestedGold] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toItems = (quantities: Record<string, number>) =>
    Object.entries(quantities)
      .filter(([, quantity]) => quantity > 0)
      .map(([cardId, quantity]) => ({ cardId, quantity }));

  const offerItems = toItems(offerQty);
  const requestItems = toItems(requestQty);
  const offeredGoldNumber = Math.max(0, Math.floor(Number(offeredGold) || 0));
  const requestedGoldNumber = Math.max(
    0,
    Math.floor(Number(requestedGold) || 0),
  );

  const valid =
    (offerItems.length > 0 || offeredGoldNumber > 0) &&
    (requestItems.length > 0 || requestedGoldNumber > 0) &&
    offerItems.length + requestItems.length > 0 &&
    offeredGoldNumber <= myGold;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const response = await fetch("/api/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId: recipient.id,
          offerItems,
          requestItems,
          offeredGold: offeredGoldNumber,
          requestedGold: requestedGoldNumber,
          message,
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(
          ERROR_MESSAGES[body?.error as string] ??
            "Something went wrong. Please try again.",
        );
        return;
      }
      router.push("/trades");
      router.refresh();
    } catch {
      setError(
        "Could not reach the server. Check your connection and try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <CardColumn
            title="You give"
            hint="Pick cards from your inventory."
            cards={myCards}
            quantities={offerQty}
            onChange={(id, q) => setOfferQty((current) => ({ ...current, [id]: q }))}
            emptyText="You have no cards available to offer."
          />
          <label className="block rounded-[28px] bg-white p-6 text-sm font-semibold shadow-soft">
            Gold you give <span className="font-normal text-mute">(you have {myGold.toLocaleString("en-US")})</span>
            <input
              type="number"
              min={0}
              max={myGold}
              step={1}
              value={offeredGold}
              onChange={(event) => setOfferedGold(event.target.value)}
              placeholder="0"
              className={`${inputClass} mt-2 text-left`}
            />
          </label>
        </div>

        <div className="space-y-4">
          <CardColumn
            title={`You get from ${recipient.name}`}
            hint="Only cards that are available to trade are shown."
            cards={theirCards}
            quantities={requestQty}
            onChange={(id, q) => setRequestQty((current) => ({ ...current, [id]: q }))}
            emptyText={`${recipient.name} has no cards available to trade.`}
          />
          <label className="block rounded-[28px] bg-white p-6 text-sm font-semibold shadow-soft">
            Gold you ask for
            <input
              type="number"
              min={0}
              max={1000000}
              step={1}
              value={requestedGold}
              onChange={(event) => setRequestedGold(event.target.value)}
              placeholder="0"
              className={`${inputClass} mt-2 text-left`}
            />
          </label>
        </div>
      </div>

      <label className="block rounded-[28px] bg-white p-6 text-sm font-semibold shadow-soft">
        Message <span className="font-normal text-mute">(optional)</span>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          maxLength={MAX_TRADE_MESSAGE}
          rows={2}
          className="mt-2 w-full resize-none rounded-xl bg-paper px-4 py-3 font-normal outline-none ring-1 ring-transparent focus:ring-ink"
        />
      </label>

      <p className="rounded-2xl bg-gold-100 px-5 py-4 text-sm text-[#7a5a10]">
        The cards and Gold you give are locked until {recipient.name} answers, you cancel, or
        the offer expires after {TRADE_EXPIRY_HOURS} hours. The items you ask for are checked
        when {recipient.name} accepts.
      </p>

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-[#FFE3D6] px-4 py-3 text-sm font-semibold text-[#B8441A]"
        >
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending || !valid}
          className="h-12 rounded-full bg-ink px-8 text-sm font-semibold text-white hover:bg-ink/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-50"
        >
          {pending ? "Sending…" : "Send offer"}
        </button>
      </div>
    </form>
  );
}
