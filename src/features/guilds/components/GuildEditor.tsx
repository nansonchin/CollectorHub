"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MAX_ANNOUNCEMENT, MAX_GUILD_DESCRIPTION } from "../guilds.config";

type Props = {
  guildId: string;
  description: string;
  announcement: string;
  canEditProfile: boolean;
  canEditAnnouncement: boolean;
};

const ERROR_MESSAGES: Record<string, string> = {
  FORBIDDEN: "You don't have permission to edit that.",
  INVALID_BODY: "Check the text length and try again.",
  UNAUTHORIZED: "Your session has expired. Please sign in again.",
};

export function GuildEditor({
  guildId,
  description: initialDescription,
  announcement: initialAnnouncement,
  canEditProfile,
  canEditAnnouncement,
}: Props) {
  const router = useRouter();
  const [description, setDescription] = useState(initialDescription);
  const [announcement, setAnnouncement] = useState(initialAnnouncement);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setPending(true);

    const changes: { description?: string; announcement?: string } = {};

    if (canEditProfile && description !== initialDescription) {
      changes.description = description;
    }

    if (canEditAnnouncement && announcement !== initialAnnouncement) {
      changes.announcement = announcement;
    }

    if (Object.keys(changes).length === 0) {
      setMessage({ kind: "ok", text: "Nothing changed." });
      setPending(false);
      return;
    }

    try {
      const response = await fetch(`/api/guilds/${guildId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setMessage({
          kind: "error",
          text:
            ERROR_MESSAGES[body?.error as string] ??
            "Something went wrong. Please try again.",
        });
        return;
      }
      setMessage({ kind: "ok", text: "Saved." });
      router.refresh();
    } catch {
      setMessage({ kind: "error", text: "Could not reach the server." });
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-[28px] bg-white p-6 shadow-soft"
    >
      <h2 className="font-display text-xl font-bold">Edit guild</h2>
      {canEditProfile && (
        <label className="block text-sm font-semibold">
          Description
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={MAX_GUILD_DESCRIPTION}
            rows={3}
            className="mt-1.5 w-full resize-none rounded-xl bg-paper px-4 py-3 font-normal outline-none ring-1 ring-transparent focus:ring-ink"
          />
        </label>
      )}
      {canEditAnnouncement && (
        <label className="block text-sm font-semibold">
          Announcement{" "}
          <span className="font-normal text-mute">(shown to everyone)</span>
          <textarea
            value={announcement}
            onChange={(event) => setAnnouncement(event.target.value)}
            maxLength={MAX_ANNOUNCEMENT}
            rows={3}
            className="mt-1.5 w-full resize-none rounded-xl bg-paper px-4 py-3 font-normal outline-none ring-1 ring-transparent focus:ring-ink"
          />
          <span className="mt-1 block text-right text-xs font-normal text-mute">
            {announcement.length}/{MAX_ANNOUNCEMENT}
          </span>
        </label>
      )}
      <div className="flex items-center justify-end gap-3">
        {message && (
          <p
            role={message.kind === "error" ? "alert" : "status"}
            className={`text-sm font-semibold ${
              message.kind === "error" ? "text-[#B8441A]" : "text-[#55701F]"
            }`}
          >
            {message.text}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="h-11 rounded-full bg-ink px-6 text-sm font-semibold text-white hover:bg-ink/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
