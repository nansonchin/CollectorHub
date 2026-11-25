"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const ERROR_MESSAGES: Record<string, string> = {
  USER_NOT_FOUND: "This player can't receive messages.",
  CANNOT_MESSAGE_SELF: "You can't message yourself.",
  UNAUTHORIZED: "Please sign in first.",
};

export function MessageButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setError(null);
    setPending(true);
    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        setError(
          ERROR_MESSAGES[body?.error as string] ?? "Something went wrong.",
        );
        return;
      }

      router.push(`/messages/${body.id}`);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setPending(false);
    }
  };

  return (
     <>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="rounded-full bg-paper px-4 py-1.5 text-sm font-semibold hover:bg-gold-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-60"
      >
        {pending ? "Opening…" : "Message"}
      </button>
      {error && (
        <span role="alert" className="text-xs font-semibold text-[#B8441A]">
          {error}
        </span>
      )}
    </>
  );
}