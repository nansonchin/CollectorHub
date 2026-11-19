"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CancelListingButton({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setPending(true);

    try {
      const response = await fetch(`/api/listings/${listingId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        setError("This listing can't be cancelled any more.");
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
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="h-10 rounded-full bg-paper px-5 text-sm font-semibold hover:bg-gold-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-60"
      >
        {pending ? "Cancelling…" : "Cancel listing"}
      </button>
      {error && (
        <p role="alert" className="text-xs font-semibold text-[#B8441A]">
          {error}
        </p>
      )}
    </div>
  );
}