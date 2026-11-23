"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function UnbanButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setPending(true);

    try {
      const response = await fetch(`/api/admin/users/${userId}/unban`, { method: "POST" });
      if (!response.ok) setError("Could not unban this player.");
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="h-10 rounded-full bg-paper px-5 text-sm font-semibold hover:bg-gold-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-60"
      >
        {pending ? "Unbanning…" : "Unban"}
      </button>
      {error && (
        <p role="alert" className="mt-1 text-xs font-semibold text-[#B8441A]">
          {error}
        </p>
      )}
    </div>
  );
}