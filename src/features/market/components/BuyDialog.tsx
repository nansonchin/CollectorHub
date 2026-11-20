"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  listingId: string;
  cardName: string;
  quantity: number;
  total: number; 
  balance: number; 
};

const ERROR_MESSAGES: Record<string, string> = {
  LISTING_NOT_AVAILABLE: "Someone else just bought this listing, or it was cancelled.",
  LISTING_RESERVED: "This listing is reserved by another buyer.",
  LISTING_NOT_FOUND: "This listing no longer exists.",
  CANNOT_BUY_OWN_LISTING: "You can't buy your own listing.",
  INSUFFICIENT_FUNDS: "You don't have enough Gold.",
  UNAUTHORIZED: "Your session has expired. Please sign in again.",
};

const buttonBase =
  "h-11 rounded-full px-6 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

export function BuyDialog({ listingId, cardName, quantity, total, balance }: Props) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const shortfall = total - balance;
  const cantAfford = shortfall > 0;

  function open() {
    setError(null);
    setDone(false);
    setAttempted(false);
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
    if (attempted) router.refresh();
  }

  async function handleBuy() {
    setError(null);
    setPending(true);
    setAttempted(true);

    try {
      const response = await fetch(`/api/listings/${listingId}/purchase`, {
        method: "POST",
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(
          ERROR_MESSAGES[body?.error as string] ??
            "Something went wrong. Please try again.",
        );
        return;
      }

      setDone(true);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        className={`${buttonBase} h-10 w-full bg-ink text-white hover:bg-ink/90`}
      >
        Buy
      </button>

      <dialog
        ref={dialogRef}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
        className="m-auto w-[min(92vw,26rem)] rounded-[28px] bg-white p-0 text-ink shadow-soft backdrop:bg-ink/40"
      >
        <div className="space-y-4 p-7">
          {done ? (
            <>
              <h2 className="font-display text-2xl font-extrabold leading-tight">
                Purchase complete
              </h2>
              <p className="text-ink/80">
                {cardName}
                {quantity > 1 && ` ×${quantity}`} is now in your inventory.
              </p>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={close}
                  className={`${buttonBase} bg-paper hover:bg-gold-100`}
                >
                  Keep browsing
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/inventory")}
                  className={`${buttonBase} bg-ink text-white hover:bg-ink/90`}
                >
                  Open inventory
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="font-display text-2xl font-extrabold leading-tight">
                Buy {cardName}
                {quantity > 1 && ` ×${quantity}`}
              </h2>

              <dl className="space-y-2 rounded-2xl bg-paper px-4 py-4 text-sm">
                <div className="flex justify-between">
                  <dt className="text-mute">Price</dt>
                  <dd className="font-semibold">{total.toLocaleString("en-US")} Gold</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-mute">Your Gold</dt>
                  <dd className="font-semibold">{balance.toLocaleString("en-US")}</dd>
                </div>
                <div className="flex justify-between border-t border-ink/10 pt-2">
                  <dt className="text-mute">After purchase</dt>
                  <dd className="font-semibold">
                    {cantAfford ? "—" : (balance - total).toLocaleString("en-US")}
                  </dd>
                </div>
              </dl>

              {cantAfford && (
                <p className="rounded-xl bg-[#FFE3D6] px-4 py-3 text-sm font-semibold text-[#B8441A]">
                  You need {shortfall.toLocaleString("en-US")} more Gold.
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

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={close}
                  className={`${buttonBase} bg-paper hover:bg-gold-100`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBuy}
                  disabled={pending || cantAfford}
                  className={`${buttonBase} bg-ink text-white hover:bg-ink/90 disabled:opacity-50`}
                >
                  {pending ? "Buying…" : "Confirm purchase"}
                </button>
              </div>
            </>
          )}
        </div>
      </dialog>
    </>
  );
}