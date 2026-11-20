"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  TEST_CARD_NUMBERS,
  TEST_CARDS,
  TestCardNumber,
} from "../payments.config";
import { formatUsd } from "../payments.format";

type Props = {
  pack: {
    id: string;
    label: string;
    gold: number;
    priceCents: number;
  };
};

type Outcome = {
  status: "SUCCEEDED" | "FAILED";
  failureReason: string | null;
  transactionId: string | null;
  balance: number | null;
};

const ERROR_MESSAGES: Record<string, string> = {
  PAYMENT_IN_PROGRESS:
    "Your payment is still being processed. Wait a moment, then press Pay again. You won't be charged twice.",
  UNAUTHORIZED: "Your session has expired. Please sign in again.",
};

const buttonBase =
  "h-11 rounded-full px-6 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

export function CheckoutDialog({ pack }: Props) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [testCard, setTestCard] = useState<TestCardNumber>("4242424242424242");
  const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [error, setError] = useState<string | null>(null);

  const idempotencyKey = useRef<string>("");

  const newAttempt = () => {
    idempotencyKey.current = crypto.randomUUID();
  };

  const open = () => {
    setOutcome(null);
    setError(null);
    newAttempt();
    dialogRef.current?.showModal();
  };

  const close = () => {
    dialogRef.current?.close();
  };

  const handleClosed = () => {
    if (outcome?.status === "SUCCEEDED") {
      router.refresh();
    }
  };

  const tryAgain = () => {
    setOutcome(null);
    setError(null);
    newAttempt();
  };

  async function handlePay() {
    setError(null);
    setPending(true);

    try {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packId: pack.id,
          testCard,
          idempotencyKey: idempotencyKey.current,
        }),
      });

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        setError(
          ERROR_MESSAGES[body?.error as string] ??
            "Something went wrong. Please try again.",
        );
        return;
      }

      setOutcome({
        status: body.payment.status,
        failureReason: body.payment.failureReason,
        transactionId: body.payment.transactionId,
        balance: body.balance,
      });
    } catch {
      setError(
        "We couldn't confirm your payment. Press Pay again. You won't be charged twice.",
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
        className={`${buttonBase} h-11 w-full bg-ink text-white hover:bg-ink/90`}
      >
        Buy for {formatUsd(pack.priceCents)}
      </button>

      <dialog
        ref={dialogRef}
        onClose={handleClosed}
        onClick={(event) => {
          if (event.target === event.currentTarget && !pending) {
            close();
          }
        }}
        className="m-auto w-[min(92vw,28rem)] rounded-[28px] bg-white p-0 text-ink shadow-soft backdrop:bg-ink/40"
      >
        <div className="space-y-4 p-7">
          {outcome?.status === "SUCCEEDED" ? (
            <>
              <h2 className="font-display text-2xl font-extrabold leading-tight">
                Payment Successfull
              </h2>
              <p className="text-ink/80">
                {pack.gold.toLocaleString("en-US")} Gold was added to your
                wallet
                {outcome.balance !== null &&
                  `Your Balance is now ${outcome.balance.toLocaleString("en-US")} Gold.`}
              </p>
              {outcome.transactionId && (
                <p className="text-xs text-mute">
                  Transaction {outcome.transactionId}
                </p>
              )}
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={close}
                  className={`${buttonBase} bg-ink text-white hover:bg-ink/90`}
                >
                  Done
                </button>
              </div>
            </>
          ) : outcome?.status === "FAILED" ? (
            <>
              <h2 className="font-display text-2xl font-extrabold leading-tight">
                Payment failed
              </h2>
              <p
                role="alert"
                className="rounded-xl bg-[#FFE3D6] px-4 py-3 text-sm font-semibold text-[#B8441A]"
              >
                {outcome.failureReason ?? "The payment could not be completed."}
              </p>
              <p className="text-sm text-mute">You were not charged.</p>
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
                  onClick={tryAgain}
                  className={`${buttonBase} bg-ink text-white hover:bg-ink/90`}
                >
                  Try another card
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="font-display text-2xl font-extrabold leading-tight">
                {pack.label}: {pack.gold.toLocaleString("en-US")} Gold
              </h2>
              <p className="rounded-xl bg-gold-100 px-4 py-3 text-sm text-[#7a5a10]">
                Test mode. Payments are simulated and no real money is charged.
              </p>
              <fieldset className="space-y-2">
                <legend className="text-sm font-semibold">Test Card</legend>
                {TEST_CARD_NUMBERS.map((number) => {
                  return (
                    <label
                      key={number}
                      className="flex cursor-pointer items-center gap-3 rounded-2xl bg-paper px-4 py-3 has-[:checked]:ring-2 has-[:checked]:ring-ink"
                    >
                      <input
                        type="radio"
                        name={`test-card-${pack.id}`}
                        value={number}
                        checked={testCard === number}
                        onChange={() => setTestCard(number)}
                        className="size-4 accent-ink"
                      />
                      <span>
                        <span className="block text-sm font-semibold">
                          {TEST_CARDS[number].label}
                        </span>
                        <span className="block text-xs text-mute">
                          {TEST_CARDS[number].hint}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </fieldset>
              {error && (
                <p>
                  <p
                    role="alert"
                    className="rounded-xl bg-[#FFE3D6] px-4 py-3 text-sm font-semibold text-[#B8441A]"
                  >
                    {error}
                  </p>
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
                  type="button"
                  onClick={handlePay}
                  disabled={pending}
                  className={`${buttonBase} bg-ink text-white hover:bg-ink/90 disabled:opacity-60`}
                >
                  {pending
                    ? "Processing…"
                    : `Pay ${formatUsd(pack.priceCents)}`}
                </button>
              </div>
            </>
          )}
        </div>
      </dialog>
    </>
  );
}
