"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  tradeId: string;
  mode: "incoming" | "outgoing";
};

const ERROR_MESSAGES: Record<string, string> = {
  NOT_ENOUGH_COPIES:
    "You no longer have enough of the requested cards available.",
  INSUFFICIENT_FUNDS: "You don't have enough Gold for this trade.",
  TRADE_NOT_AVAILABLE: "This offer is no longer available.",
  TRADE_NOT_FOUND: "This offer could not be found.",
  UNAUTHORIZED: "Your session has expired. Please sign in again.",
};

const buttonBase =
  "h-10 rounded-full px-5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-60";

export function TradeAction({ tradeId, mode }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(action: "accept" | "reject" | "cancel") {
    setError(null);
    setPending(true);

    try {
      const response = await fetch(`/api/trades/${tradeId}/${action}`, {
        method: "POST",
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(
          ERROR_MESSAGES[body?.error as string] ??
            "Something went wrong. Please try again.",
        );
        setConfirming(false);
        router.refresh();
        return;
      }

      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="flex flex-col items-end gap-2">
      {mode === "outgoing" ? (
        <button
          type="button"
          onClick={() => send("cancel")}
          disabled={pending}
          className={`${buttonBase} bg-paper hover:bg-gold-100`}
        >
          {pending ? "Cancelling…" : "Cancel offer"}
        </button>
      ) : confirming ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={pending}
            className={`${buttonBase} bg-paper hover:bg-gold-100`}
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => send("accept")}
            disabled={pending}
            className={`${buttonBase} bg-ink text-white hover:bg-ink/90`}
          >
            {pending ? "Trading…" : "Confirm trade"}
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => send("reject")}
            disabled={pending}
            className={`${buttonBase} bg-paper hover:bg-gold-100`}
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={pending}
            className={`${buttonBase} bg-ink text-white hover:bg-ink/90`}
          >
            Accept
          </button>
        </div>
      )}
      {error && (
        <p
          role="alert"
          className="max-w-64 text-right text-xs font-semibold text-[#B8441A]"
        >
          {error}
        </p>
      )}
    </div>
  );
}
