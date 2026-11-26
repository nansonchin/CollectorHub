"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const ERROR_MESSAGES: Record<string, string> = {
  REQUEST_NOT_FOUND: "Someone else already handled this request.",
  GUILD_FULL: "The guild is full. Remove a member first.",
  ALREADY_IN_GUILD: "This player has already joined another guild.",
  FORBIDDEN: "You don't have permission to do this.",
  UNAUTHORIZED: "Your session has expired. Please sign in again.",
};

export function RequestAction({
  guildId,
  userId,
}: {
  guildId: string;
  userId: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const send = async (action: "approve" | "reject") => {
    setError(null);
    setPending(action);

    try {
      const response = await fetch(
        `/api/guilds/${guildId}/requests/${userId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(
          ERROR_MESSAGES[body?.error as string] ??
            "Something went wrong. Please try again.",
        );
      }
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void send("reject")}
          disabled={pending != null}
          className="h-9 rounded-full bg-paper px-4 text-sm font-semibold hover:bg-gold-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-60"
        >
          {pending === "reject" ? "…" : "Decline"}
        </button>
        <button
          type="button"
          onClick={() => void send("approve")}
          disabled={pending !== null}
          className="h-9 rounded-full bg-ink px-4 text-sm font-semibold text-white hover:bg-ink/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-60"
        >
          {pending === "approve" ? "…" : "Approve"}
        </button>
      </div>
      {error && (
        <p
          role="alert"
          className="max-w-56 text-right text-xs font-semibold text-[#B8441A]"
        >
          {error}
        </p>
      )}
    </div>
  );
}
