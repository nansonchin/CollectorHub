"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  GUILD_CREATION_COST,
  MAX_GUILD_DESCRIPTION,
  MAX_GUILD_NAME,
  MIN_GUILD_NAME,
} from "../guilds.config";

const ERROR_MESSAGES: Record<string, string> = {
  NAME_TAKEN: "That name is already taken. Your Gold was not charged.",
  ALREADY_IN_GUILD: "You are already in a guild. Leave it first.",
  INSUFFICIENT_FUNDS: "You don't have enough Gold to create a guild.",
  INVALID_BODY:
    "Check the name (letters, numbers, spaces, - _ ') and try again.",
  UNAUTHORIZED: "Your session has expired. Please sign in again.",
};

const inputClass =
  "mt-1.5 h-12 w-full rounded-xl bg-paper px-4 font-normal outline-none ring-1 ring-transparent focus:ring-ink";

const buttonBase =
  "h-11 rounded-full px-6 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

export function CreateGuildDialog({ gold }: { gold: number }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAfford = gold >= GUILD_CREATION_COST;
  const valid = name.trim().length >= MIN_GUILD_NAME && canAfford;

  const open = () => {
    setName("");
    setDescription("");
    setError(null);
    dialogRef.current?.showModal();
  };
  const close = () => {
    dialogRef.current?.close();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setError(null);
    setPending(true);

    try {
      const response = await fetch("/api/guilds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        setError(
          ERROR_MESSAGES[body?.error as string] ??
            "Something went wrong. Please try again.",
        );
        return;
      }
      close();

      router.push(`/guilds/${body.id}`);
      router.refresh();
    } catch {
      setError(
        "Could not reach the server. Check your connection and try again.",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={open}
        className={`${buttonBase} bg-ink text-white hover:bg-ink/90`}
      >
        Create a guild
      </button>
      <dialog
        ref={dialogRef}
        onClick={(event) => {
          if (event.target === event.currentTarget && !pending) {
            return close();
          }
        }}
        className="m-auto w-[min(92vw,28rem)] rounded-[28px] bg-white p-0 text-ink shadow-soft backdrop:bg-ink/40"
      >
        <form onSubmit={handleSubmit} className="space-y-4 p-7">
          <h2 className="font-display text-2xl font-extrabold leading-tight">
            Create a guild
          </h2>
          <label className="block text-sm font-semibold">
            Name
            <input
              type="text"
              required
              minLength={MIN_GUILD_NAME}
              maxLength={MAX_GUILD_NAME}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={inputClass}
            />
            <span className="mt-1.5 block text-xs font-normal text-mute">
              {MIN_GUILD_NAME}–{MAX_GUILD_NAME} characters. Letters, numbers,
              spaces, - _ and &apos;.
            </span>
          </label>
          <label className="block text-sm font-semibold">
            Description{" "}
            <span className="font-normal text-mute">(optional)</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={MAX_GUILD_DESCRIPTION}
              rows={3}
              className="mt-1.5 w-full resize-none rounded-xl bg-paper px-4 py-3 font-normal outline-none ring-1 ring-transparent focus:ring-ink"
            />
          </label>

          <p
            className={`rounded-xl px-4 py-3 text-sm ${
              canAfford
                ? "bg-gold-100 text-[#7a5a10]"
                : "bg-[#FFE3D6] font-semibold text-[#B8441A]"
            }`}
          >
            Creating a guild costs {GUILD_CREATION_COST.toLocaleString("en-US")}{" "}
            Gold. You have {gold.toLocaleString("en-US")}.
          </p>
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
              disabled={pending}
              className={`${buttonBase} bg-paper hover:bg-gold-100 disabled:opacity-50`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending || !valid}
              className={`${buttonBase} bg-ink text-white hover:bg-ink/90 disabled:opacity-50`}
            >
              {pending ? "Creating…" : "Create guild"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
