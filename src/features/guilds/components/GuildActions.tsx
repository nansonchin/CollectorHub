"use client"
import { refresh } from "next/cache";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { MAX_REQUEST_MESSAGE } from "../guilds.config";

type Props = {
  guildId: string;
  guildName: string;
  mode: "request" | "cancel-request" | "leave" | "disband";
};

const ERROR_MESSAGES: Record<string, string> = {
  ALREADY_IN_GUILD: "You are already in a guild.",
  GUILD_FULL: "This guild is full.",
  TOO_MANY_REQUESTS: "You have too many pending requests. Cancel one first.",
  ALREADY_REQUESTED: "You have already asked to join this guild.",
  REQUEST_NOT_FOUND: "That request no longer exists.",
  OWNER_CANNOT_LEAVE:
    "The owner can't leave. Transfer ownership or disband the guild.",
  NOT_A_MEMBER: "You are not a member of this guild.",
  FORBIDDEN: "You don't have permission to do this.",
  GUILD_NOT_FOUND: "This guild no longer exists.",
  UNAUTHORIZED: "Your session has expired. Please sign in again.",
};

const buttonBase =
  "h-11 rounded-full px-6 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-60";

export function GuildActions({ guildId, guildName, mode }: Props) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [message, setMessage] = useState("");
  const [typedName, setTypedName] = useState("");
  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const call = async (
    url: string,
    init: RequestInit,
    afterSuccess?: () => void,
  ) => {
    setError(null);
    setPending(true);

    try {
      const response = await fetch(url, init);
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(
          ERROR_MESSAGES[body?.error as string] ??
            "Something went wrong. Please try again.",
        );
        setConfirmingLeave(false);
        router.refresh();
        refresh;
      }

      dialogRef.current?.close();

      if (afterSuccess) {
        afterSuccess();
      } else {
        router.refresh();
      }
    } catch {
      setError("Could not reach the server.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-2">
      {mode === "request" && (
        <>
          <button
            type="button"
            onClick={() => {
              setMessage("");
              setError(null);
              dialogRef.current?.showModal();
            }}
            className={`${buttonBase} bg-ink text-white hover:bg-ink/90`}
          >
            Request to join
          </button>
          <dialog
            ref={dialogRef}
            onClick={(event) => {
              if (event.target === event.currentTarget && !pending)
                dialogRef.current?.close();
            }}
            className="m-auto w-[min(92vw,26rem)] rounded-[28px] bg-white p-0 text-ink shadow-soft backdrop:bg-ink/40"
          >
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void call(`/api/guilds/${guildId}/requests`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ message }),
                });
              }}
              className="space-y-4 p-7"
            >
              <h2 className="font-display text-2xl font-extrabold leading-tight">
                Join {guildName}
              </h2>
              <label className="block text-sm font-semibold">
                Message{" "}
                <span className="font-normal text-mute">(optional)</span>
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  maxLength={MAX_REQUEST_MESSAGE}
                  rows={3}
                  className="mt-1.5 w-full resize-none rounded-xl bg-paper px-4 py-3 font-normal outline-none ring-1 ring-transparent focus:ring-ink"
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
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => dialogRef.current?.close()}
                  disabled={pending}
                  className={`${buttonBase} bg-paper hover:bg-gold-100`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className={`${buttonBase} bg-ink text-white hover:bg-ink/90`}
                >
                  {pending ? "Sending…" : "Send request"}
                </button>
              </div>
            </form>
          </dialog>
        </>
      )}

      {mode === "cancel-request" && (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            void call(`/api/guilds/${guildId}/requests`, {
              method: "DELETE",
            })
          }
          className={`${buttonBase} bg-paper hover:bg-gold-100`}
        >
          {pending ? "Cancelling…" : "Cancel request"}
        </button>
      )}

      {mode === "leave" &&
        (confirmingLeave ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmingLeave(false)}
              disabled={pending}
              className={`${buttonBase} bg-paper hover:bg-gold-100`}
            >
              Stay
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                void call(`/api/guilds/${guildId}/leave`, { method: "POST" })
              }
              className={`${buttonBase} bg-[#B8441A] text-white hover:bg-[#a33c16]`}
            >
              {pending ? "Leaving…" : "Confirm leave"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingLeave(true)}
            className={`${buttonBase} bg-paper hover:bg-gold-100`}
          >
            Leave guild
          </button>
        ))}
      {mode === "disband" && (
        <>
          <button
            type="button"
            onClick={() => {
              setTypedName("");
              setError(null);
              dialogRef.current?.showModal();
            }}
            className={`${buttonBase} bg-paper text-[#B8441A] hover:bg-[#FFE3D6]`}
          >
            Disband guild
          </button>
          <dialog
            ref={dialogRef}
            onClick={(event) => {
              if (event.target === event.currentTarget && !pending)
                dialogRef.current?.close();
            }}
            className="m-auto w-[min(92vw,26rem)] rounded-[28px] bg-white p-0 text-ink shadow-soft backdrop:bg-ink/40"
          >
            <div className="space-y-4 p-7">
              <h2 className="font-display text-2xl font-extrabold leading-tight">
                Disband {guildName}
              </h2>
              <p className="text-sm text-ink/80">
                This removes the guild and all its members. It can&apos;t be
                undone, and the creation fee is not refunded. Type the guild
                name to confirm.
              </p>
              <label className="block text-sm font-semibold">
                Guild Name
                <input
                  type="text"
                  value={typedName}
                  onChange={(event) => setTypedName(event.target.value)}
                  className="mt-1.5 h-12 w-full rounded-xl bg-paper px-4 font-normal outline-none ring-1 ring-transparent focus:ring-ink"
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
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => dialogRef.current?.close()}
                  disabled={pending}
                  className={`${buttonBase} bg-paper hover:bg-gold-100`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={pending || typedName.trim() !== guildName}
                  onClick={() =>
                    void call(
                      `/api/guilds/${guildId}`,
                      { method: "DELETE" },
                      () => {
                        router.push("/guilds");
                        router.refresh();
                      },
                    )
                  }
                  className={`${buttonBase} bg-[#B8441A] text-white hover:bg-[#a33c16]`}
                >
                  {pending ? "Disbanding…" : "Disband"}
                </button>
              </div>
            </div>
          </dialog>
        </>
      )}
      {error && mode !== "request" && mode !== "disband" && (
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
