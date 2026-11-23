"use client";

import { useRef, useState } from "react";
import {
  MAX_REPORT_DETAILS,
  REPORT_REASON_IDS,
  REPORT_REASON_LABELS,
  type ReportReasonId,
  type ReportTargetTypeId,
} from "../moderation.config";

type Props = {
  targetType: ReportTargetTypeId;
  targetId: string;
  subject: string; 
};

const ERROR_MESSAGES: Record<string, string> = {
  ALREADY_REPORTED: "You have already reported this. Our moderators will take a look.",
  CANNOT_REPORT_SELF: "You can't report yourself.",
  TARGET_NOT_FOUND: "This no longer exists.",
  REPORT_LIMIT: "You've sent too many reports today. Please try again tomorrow.",
  INVALID_BODY: "Check your report and try again.",
  UNAUTHORIZED: "Your session has expired. Please sign in again.",
};

const buttonBase =
  "h-11 rounded-full px-6 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

export function ReportDialog({ targetType, targetId, subject }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState<ReportReasonId | null>(null);
  const [details, setDetails] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function open() {
    setReason(null);
    setDetails("");
    setError(null);
    setDone(false);
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reason) return;
    setError(null);
    setPending(true);

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId, reason, details }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(
          ERROR_MESSAGES[body?.error as string] ?? "Something went wrong. Please try again.",
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
        className="rounded text-xs font-semibold text-mute underline underline-offset-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        Report
      </button>

      <dialog
        ref={dialogRef}
        onClick={(event) => {
          if (event.target === event.currentTarget && !pending) close();
        }}
        className="m-auto w-[min(92vw,28rem)] rounded-[28px] bg-white p-0 text-ink shadow-soft backdrop:bg-ink/40"
      >
        {done ? (
          <div className="space-y-4 p-7">
            <h2 className="font-display text-2xl font-extrabold leading-tight">
              Report sent
            </h2>
            <p className="text-ink/80">
              Thank you. Our moderators will review it. We won&apos;t tell the other player
              who reported them.
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={close}
                className={`${buttonBase} bg-ink text-white hover:bg-ink/90`}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 p-7">
            <h2 className="font-display text-2xl font-extrabold leading-tight">
              Report {subject}
            </h2>

            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold">What&apos;s the problem?</legend>
              {REPORT_REASON_IDS.map((id) => (
                <label
                  key={id}
                  className="flex cursor-pointer items-center gap-3 rounded-2xl bg-paper px-4 py-3 has-[:checked]:ring-2 has-[:checked]:ring-ink"
                >
                  <input
                    type="radio"
                    name="reason"
                    value={id}
                    checked={reason === id}
                    onChange={() => setReason(id)}
                    className="size-4 accent-ink"
                  />
                  <span className="text-sm font-semibold">{REPORT_REASON_LABELS[id]}</span>
                </label>
              ))}
            </fieldset>

            <label className="block text-sm font-semibold">
              Details <span className="font-normal text-mute">(optional)</span>
              <textarea
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                maxLength={MAX_REPORT_DETAILS}
                rows={3}
                className="mt-1.5 w-full resize-none rounded-xl bg-paper px-4 py-3 font-normal outline-none ring-1 ring-transparent focus:ring-ink"
              />
              <span className="mt-1 block text-right text-xs font-normal text-mute">
                {details.length}/{MAX_REPORT_DETAILS}
              </span>
            </label>

            {error && (
              <p
                role="alert"
                className="rounded-xl bg-[#FFE3D6] px-4 py-3 text-sm font-semibold text-[#B8441A]"
              >
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2">
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
                disabled={pending || reason === null}
                className={`${buttonBase} bg-ink text-white hover:bg-ink/90 disabled:opacity-50`}
              >
                {pending ? "Sending…" : "Send report"}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}