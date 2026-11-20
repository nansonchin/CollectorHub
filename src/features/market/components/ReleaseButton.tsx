"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ReleaseButton({ reservationId }: { reservationId: string }) {
  const router = useRouter();

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setError(null);
    setPending(true);

    try {
      const response = await fetch(`/api/reservations/${reservationId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        setError("This reservation can't be released any more.");
      }
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="h-10 w-full rounded-full bg-paper px-4 text-sm font-semibold hover:bg-gold-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-60"
      >
        {pending ? "Releasing…" : "Release"}
      </button>
      {error && (
        <p role="alert" className="mt-1.5 text-xs font-semibold text-[#B8441A]">
          {error}
        </p>
      )}
    </div>
  );
}
