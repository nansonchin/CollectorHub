"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { TestCardNumber } from "../payments.config";

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

  const handleClose = () => {
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

  return(
    <>
        <button>
            
        </button>
    </>
  )
}
