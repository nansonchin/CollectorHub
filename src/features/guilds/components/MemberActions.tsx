"use client";

import { useRouter } from "next/navigation";
import { MemberAction } from "../guilds.schema";
import { useState } from "react";

type Props = {
  guildId: string;
  targetId: string;
  targetName: string;
  actions: MemberAction[];
};

const LABELS: Record<MemberAction, string> = {
  promote: "Make moderator",
  demote: "Make member",
  kick: "Remove",
  transfer: "Make owner",
};

const NEEDS_CONFIRM: MemberAction[] = ["kick", "transfer"];

const ERROR_MESSAGES: Record<string, string> = {
  FORBIDDEN: "You don't have permission to do this.",
  NOT_A_MEMBER: "This player is no longer in the guild.",
  INVALID_TARGET: "You can't do that to this player.",
  GUILD_NOT_FOUND: "This guild no longer exists.",
  UNAUTHORIZED: "Your session has expired. Please sign in again.",
};

export function MemberActions({
  guildId,
  targetId,
  targetName,
  actions,
}: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState<MemberAction | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (action: MemberAction) => {
    setError(null);
    setPending(true);

    try {
      const response = await fetch(
        `/api/guilds/${guildId}/members/${targetId}`,
        {
          method: "POST",
          headers: { "Content-type": "application/json" },
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
      setConfirming(null);
      router.refresh();
    } catch {
      setError("Could not refresh reach the server");
    } finally {
    }
  };

  return (
    <div className="flex flex-col item-end gap-1">
      {confirming ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-mute">
            {LABELS[confirming]} · {targetName}?
          </span>
          <button
            type="button"
            onClick={() => setConfirming(null)}
            disabled={pending}
            className="h-8 rounded-full bg-paper px-3 text-xs font-semibold hover:bg-gold-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => void send(confirming)}
            disabled={pending}
            className="h-8 rounded-full bg-ink px-3 text-xs font-semibold text-white hover:bg-ink/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-60"
          >
            {pending ? "…" : "Confirm"}
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap justify-end gap-1.5">
          {actions.map((action) => (
            <button
              key={action}
              type="button"
              disabled={pending}
              onClick={() => {
                NEEDS_CONFIRM.includes(action)
                  ? setConfirming(action)
                  : void send(action);
              }}
              className={`h-8 rounded-full px-3 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-60 ${
                action === "kick"
                  ? "bg-paper text-[#B8441A] hover:bg-[#FFE3D6]"
                  : "bg-paper hover:bg-gold-100"
              }`}
            >
              {LABELS[action]}
            </button>
          ))}
        </div>
      )}
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
