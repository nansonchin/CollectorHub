"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type Props = {
  cardId: string;
  cardName: string;
  available: number;
};

const ERROR_MESSAGES: Record<string, string> = {
  NOT_ENOUGH_COPIES: "You don't have enough available copies of this card.",
  INVALID_BODY: "Check the quantity and the price, then try again.",
  UNAUTHORIZED: "Your session has expired. Please sign in again.",
};

const inputClass =
  "mt-1.5 h-12 w-full rounded-xl bg-paper px-4 font-normal outline-none ring-1 ring-transparent focus:ring-ink";

export function SellDialog({ cardId, cardName, available }: Props) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [quantity, setQuantity] = useState("1");
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const total = (Number(quantity) || 0) * (Number(price) || 0);

  const open = () => {
    setError(null);
    setQuantity("1");
    setPrice("");
    dialogRef.current?.showModal();
  };

  const close = () => {
    dialogRef.current?.close();
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const response = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId,
          quantity: Number(quantity),
          unitPrice: Number(price),
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
    } catch (error) {
      setError(
        "Could not reach the server. Check your connection and try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        disabled={available === 0}
        className="h-9 rounded-full bg-ink px-4 text-sm font-semibold text-white hover:bg-ink/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-40"
      >
        Sell
      </button>
      <dialog
        ref={dialogRef}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
        className="m-auto w-[min(92vw,26rem)] rounded-[28px] bg-white p-0 text-ink shadow-soft backdrop:bg-ink/40"
      >
        <form onSubmit={handleSubmit} className="space-y-4 p-7">
          <h2 className="font-display text-2xl font-extrabold leading-tight">
            Sell {cardName}
          </h2>

          <label className="block text-sm font-semibold">
            Quantity
            <input
              type="number"
              required
              min={1}
              max={available}
              step={1}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className={inputClass}
            />
            <span className="mt-1.5 block text-xs font-normal text-mute">
              You have {available} available.
            </span>
          </label>

          <label className="block text-sm font-semibold">
            Price per card (Gold)
            <input
              type="number"
              required
              min={1}
              max={1000000}
              step={1}
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              className={inputClass}
            />
          </label>

          <p className="rounded-xl bg-gold-100 px-4 py-3 text-sm font-semibold text-[#7a5a10]">
            Listing total: {total.toLocaleString("en-US")} Gold
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
              className="h-11 rounded-full bg-paper px-5 text-sm font-semibold hover:bg-gold-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="h-11 rounded-full bg-ink px-6 text-sm font-semibold text-white hover:bg-ink/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-60"
            >
              {pending ? "Listing…" : "List for sale"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
