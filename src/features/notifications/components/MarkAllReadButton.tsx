"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function MarkAllReadButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    try {
      await fetch("/api/notifications/read-all", {
        method: "POST",
      });
    } finally {
      setPending(false);
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="h-10 rounded-full bg-paper px-5 text-sm font-semibold hover:bg-gold-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-60"
    >
      {pending ? "Marking…" : "Mark all as read"}
    </button>
  );
}
