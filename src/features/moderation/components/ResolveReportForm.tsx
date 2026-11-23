"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  MAX_ADMIN_TEXT,
  RESOLVE_ACTION_LABELS,
  type ResolveActionId,
} from "../moderation.config";

type Props = {
  reportId: string;
  actions: ResolveActionId[];
};

const ERROR_MESSAGES: Record<string, string> = {
  REPORT_ALREADY_HANDLED: "Another moderator has already handled this report.",
  ACTION_NOT_ALLOWED: "You are not allowed to take this action.",
  MESSAGE_REQUIRED: "Please write the message for the player.",
  INVALID_ACTION: "This action doesn't apply to this report.",
  FORBIDDEN: "You don't have permission to do this.",
  UNAUTHORIZED: "Your session has expired. Please sign in again.",
};

export function ResolveReportForm({ reportId, actions }: Props) {
  const router = useRouter();
  const [action, setAction] = useState<ResolveActionId>("DISMISS");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsMessage = action === "WARN_USER" || action === "BAN_USER";
  const destructive = action === "BAN_USER" || action === "REMOVE_LISTING";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const response = await fetch(`/api/admin/reports/${reportId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note, message: needsMessage ? message : "" }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(
          ERROR_MESSAGES[body?.error as string] ?? "Something went wrong. Please try again.",
        );
        if (body?.error === "REPORT_ALREADY_HANDLED") router.refresh();
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
    <form onSubmit={handleSubmit} className="space-y-4 border-t border-ink/10 pt-4">
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">Action</legend>
        <div className="flex flex-wrap gap-2">
          {actions.map((id) => (
            <label
              key={id}
              className={`cursor-pointer rounded-full px-4 py-2 text-sm font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink ${
                action === id ? "bg-ink text-white" : "bg-paper hover:bg-gold-100"
              }`}
            >
              <input
                type="radio"
                name={`action-${reportId}`}
                value={id}
                checked={action === id}
                onChange={() => setAction(id)}
                className="sr-only"
              />
              {RESOLVE_ACTION_LABELS[id]}
            </label>
          ))}
        </div>
      </fieldset>

      {needsMessage && (
        <label className="block text-sm font-semibold">
          {action === "BAN_USER"
            ? "Reason (shown to the player when they try to sign in)"
            : "Message (shown to the player on their account page)"}
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={MAX_ADMIN_TEXT}
            required
            rows={2}
            className="mt-1.5 w-full resize-none rounded-xl bg-paper px-4 py-3 font-normal outline-none ring-1 ring-transparent focus:ring-ink"
          />
        </label>
      )}

      <label className="block text-sm font-semibold">
        Internal note <span className="font-normal text-mute">(only staff can see this)</span>
        <input
          type="text"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={MAX_ADMIN_TEXT}
          className="mt-1.5 h-11 w-full rounded-xl bg-paper px-4 font-normal outline-none ring-1 ring-transparent focus:ring-ink"
        />
      </label>

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
          disabled={pending}
          className={`h-11 rounded-full px-6 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-60 ${
            destructive ? "bg-[#B8441A] hover:bg-[#a33c16]" : "bg-ink hover:bg-ink/90"
          }`}
        >
          {pending ? "Saving…" : "Confirm"}
        </button>
      </div>
    </form>
  );
}