"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  questId: string;
  mode: "accept" | "creator" | "accepter";
  canDeliver?: boolean;
};

const ERROR_MESSAGES: Record<string, string> = {
  QUEST_NOT_AVAILABLE: "This quest is no longer available.",
  QUEST_NOT_FOUND: "This quest could not be found.",
  CANNOT_ACCEPT_OWN: "You can't accept your own quest.",
  TOO_MANY_ACCEPTED:
    "You have too many accepted quests. Deliver or abandon one first.",
  NOT_ENOUGH_COPIES:
    "You don't have enough of these cards available to deliver.",
  UNAUTHORIZED: "Your session has expired. Please sign in again.",
};

const buttonBase =
  "h-10 rounded-full px-5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-60";

export function QuestActions({ questId, mode, canDeliver = false }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (action: "accept" | "abandon" | "deliver" | "cancel") => {
    setError(null);
    setPending(true);
    try {
      const response = await fetch(`/api/quests/${questId}/${action}`, {
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
  };

  return (
    <div className="flex flex-col gap-2">
      {mode === "accept" && (
        <button
          type="button"
          onClick={() => send("accept")}
          disabled={pending}
          className={`${buttonBase} w-full bg-ink text-white hover:bg-ink/90`}
        >
          {pending ? "Accepting…" : "Accept quest"}
        </button>
      )}
      {mode === "creator" && (
        <button
          type="button"
          onClick={() => send("cancel")}
          disabled={pending}
          className={`${buttonBase} bg-paper hover:bg-gold-100`}
        >
          {pending ? "Cancelling…" : "Cancel quest"}
        </button>
      )}
      {mode === "accepter" &&
        (confirming ? (
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
              onClick={() => send("deliver")}
              disabled={pending}
              className={`${buttonBase} bg-ink text-white hover:bg-ink/90`}
            >
              {pending ? "Delivering…" : "Confirm delivery"}
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => send("abandon")}
              disabled={pending}
              className={`${buttonBase} bg-paper hover:bg-gold-100`}
            >
              Abandon
            </button>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={pending || !canDeliver}
              className={`${buttonBase} bg-ink text-white hover:bg-ink/90`}
            >
              Deliver
            </button>
          </div>
        ))}
      {error && (
        <p
          role="alert"
          className="max-w-64 text-xs font-semibold text-[#B8441A]"
        >
          {error}
        </p>
      )}
    </div>
  );
}
