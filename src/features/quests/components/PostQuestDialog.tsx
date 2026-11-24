"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { formatCardNumber } from "../../cards/cards.meta";
import { ACCEPT_HOLD_HOURS, MAX_QUEST_QUANTITY, MAX_QUEST_REWARD, QUEST_EXPIRY_DAYS } from "../quests.config";

type Props = {
  cards: {
    id: string;
    name: string;
    number: number;
  }[];
  gold: number;
};

const ERROR_MESSAGES: Record<string, string> = {
  INSUFFICIENT_FUNDS: "You don't have enough Gold to offer that reward.",
  TOO_MANY_OPEN_QUESTS: "You have too many active quests. Cancel one first.",
  INVALID_CARD: "That card is not valid.",
  INVALID_BODY: "Check the card, quantity and reward, then try again.",
  UNAUTHORIZED: "Your session has expired. Please sign in again.",
};

const inputClass =
  "mt-1.5 h-12 w-full rounded-xl bg-paper px-4 font-normal outline-none ring-1 ring-transparent focus:ring-ink";

const buttonBase =
  "h-11 rounded-full px-6 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

export function PostQuestDialog({ cards, gold }: Props) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [cardId, setCardId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [reward, setReward] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rewardNumber = Math.floor(Number(reward) || 0);
  const valid =
    cardId !== "" &&
    Number(quantity) >= 1 &&
    rewardNumber >= 1 &&
    rewardNumber <= gold;

  const open = () => {
    setCardId("");
    setQuantity("1");
    setReward("");
    setError(null);
    dialogRef.current?.showModal();
  };

  const close = () => {
    dialogRef.current?.close();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const response = await fetch("/api/quests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId,
          quantity: Number(quantity),
          rewardGold: rewardNumber,
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

      close();
      router.refresh();
    } catch {
      setError(
        "Could not reach the server. Check your connection and try again.",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={open}
        className={`${buttonBase} bg-ink text-white hover:bg-ink/90`}
      >
        Post a quest
      </button>
      <dialog
        ref={dialogRef}
        onClick={(event) => {
          if (event.target === event.currentTarget && !pending) close();
        }}
        className="m-auto w-[min(92vw,28rem)] rounded-[28px] bg-white p-0 text-ink shadow-soft backdrop:bg-ink/40"
      >
        <form onSubmit={handleSubmit} className="space-y-4 p-7">
          <h2 className="font-display text-2xl font-extrabold leading-tight">
            Post a quest
          </h2>
          <label className="block text-sm font-semibold">
            Card you want
            <select
              required
              value={cardId}
              onChange={(event) => setCardId(event.target.value)}
              className={inputClass}
            >
              <option value="">Choose a card…</option>
              {cards.map((card) => (
                <option key={card.id} value={card.id}>
                  N°{formatCardNumber(card.number)} {card.name}
                </option>
              ))}
            </select>
          </label>
            <label className="block text-sm font-semibold">
            Quantity
            <input
              type="number"
              required
              min={1}
              max={MAX_QUEST_QUANTITY}
              step={1}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className={inputClass}
            />
          </label>
            <label className="block text-sm font-semibold">
            Reward (Gold){" "}
            <span className="font-normal text-mute">
              you have {gold.toLocaleString("en-US")}
            </span>
            <input
              type="number"
              required
              min={1}
              max={Math.min(gold, MAX_QUEST_REWARD)}
              step={1}
              value={reward}
              onChange={(event) => setReward(event.target.value)}
              className={inputClass}
            />
          </label>    <p className="rounded-xl bg-gold-100 px-4 py-3 text-sm text-[#7a5a10]">
            The reward is frozen when you post, and paid out when someone delivers the cards.
            Unfinished quests expire after {QUEST_EXPIRY_DAYS} days and the reward comes back.
            Whoever accepts has {ACCEPT_HOLD_HOURS} hours to deliver.
          </p>

          {error && (
            <p
              role="alert"
              className="rounded-xl bg-[#FFE3D6] px-4 py-3 text-sm font-semibold text-[#B8441A]"
            >
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={close}
              disabled={pending}
              className={`${buttonBase} bg-paper hover:bg-gold-100 disabled:opacity-50`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending || !valid}
              className={`${buttonBase} bg-ink text-white hover:bg-ink/90 disabled:opacity-50`}
            >
              {pending ? "Posting…" : "Post quest"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
