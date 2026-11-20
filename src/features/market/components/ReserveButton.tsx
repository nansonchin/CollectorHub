"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const ERROR_MESSAGES: Record<string, string> = {
  LISTING_RESERVED: "Someone just reserved this listing.",
  LISTING_NOT_AVAILABLE: "This listing is no longer available.",
  LISTING_NOT_FOUND: "This listing no longer exists.",
  CANNOT_BUY_OWN_LISTING: "You can't reserve your own listing.",
  RESERVATION_LIMIT:
    "You have too many active reservations. Release one first.",
  UNAUTHORIZED: "Your session has expired. Please sign in again.",
};

export function ReserveButton({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setPending(true);

    try {
      const response = await fetch(`/api/listings/${listingId}/reserve`, {
        method: "POST",
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(
          ERROR_MESSAGES[body?.error as string] ??
            "Something went wrong. Try again.",
        );
        router.refresh();
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
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="h-10 w-full rounded-full bg-paper px-4 text-sm font-semibold hover:bg-gold-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-60"
      >
        {pending ? "Reserving…" : "Reserve"}
      </button>
       {error && (
        <p role="alert" className="mt-1.5 text-xs font-semibold text-[#B8441A]">
          {error}
        </p>
      )}
    </div>
  );
}
