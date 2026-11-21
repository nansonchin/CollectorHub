"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import {
  MAX_COMMENT_LENGTH,
  MAX_REVIEW_TAGS,
  REVIEW_TAG_IDS,
  REVIEW_TAG_LABELS,
  type ReviewTagId,
} from "../reviews.config";

type Props = {
  orderId: string;
  cardName: string;
  counterpartName: string;
};

const ERROR_MESSAGES: Record<string, string> = {
  ALREADY_REVIEWED: "You have already reviewed this order.",
  ORDER_NOT_FOUND: "This order could not be found.",
  INVALID_BODY: "Check your rating and comment, then try again.",
  UNAUTHORIZED: "Your session has expired. Please sign in again.",
};

const buttonBase =
  "h-11 rounded-full px-6 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

export function ReviewDialog({ orderId, cardName, counterpartName }: Props) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState<ReviewTagId[]>([]);
  const [comment, setComment] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function open() {
    setRating(0);
    setTags([]);
    setComment("");
    setError(null);
    setDone(false);
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  function handleClosed() {
    if (done) router.refresh();
  }

  function toggleTag(tag: ReviewTagId) {
    setTags((current) =>
      current.includes(tag)
        ? current.filter((item) => item !== tag)
        : current.length < MAX_REVIEW_TAGS
          ? [...current, tag]
          : current,
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const response = await fetch(`/api/orders/${orderId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, tags, comment }),
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
        className={`${buttonBase} h-10 bg-ink px-5 text-white hover:bg-ink/90`}
      >
        Leave review
      </button>

      <dialog
        ref={dialogRef}
        onClose={handleClosed}
        onClick={(event) => {
          if (event.target === event.currentTarget && !pending) close();
        }}
        className="m-auto w-[min(92vw,28rem)] rounded-[28px] bg-white p-0 text-ink shadow-soft backdrop:bg-ink/40"
      >
        {done ? (
          <div className="space-y-4 p-7">
            <h2 className="font-display text-2xl font-extrabold leading-tight">
              Thanks for your review
            </h2>
            <p className="text-ink/80">
              Your feedback about {counterpartName} is now visible on their profile.
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
            <div>
              <h2 className="font-display text-2xl font-extrabold leading-tight">
                Review {counterpartName}
              </h2>
              <p className="mt-1 text-sm text-mute">About your trade for {cardName}.</p>
            </div>

            <fieldset>
              <legend className="text-sm font-semibold">Rating</legend>
              <div className="mt-2 flex gap-1">
                {[1, 2, 3, 4, 5].map((value) => (
                  <label
                    key={value}
                    className="cursor-pointer rounded-lg p-1 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ink"
                  >
                    <input
                      type="radio"
                      name="rating"
                      value={value}
                      checked={rating === value}
                      onChange={() => setRating(value)}
                      className="sr-only"
                    />
                    <span className="sr-only">
                      {value} {value === 1 ? "star" : "stars"}
                    </span>
                    <Star
                      size={32}
                      aria-hidden
                      fill="currentColor"
                      strokeWidth={0}
                      className={value <= rating ? "text-gold-500" : "text-ink/15"}
                    />
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-sm font-semibold">
                Tags <span className="font-normal text-mute">(up to {MAX_REVIEW_TAGS})</span>
              </legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {REVIEW_TAG_IDS.map((tag) => {
                  const selected = tags.includes(tag);
                  return (
                    <label
                      key={tag}
                      className={`cursor-pointer rounded-full px-4 py-2 text-sm font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink ${
                        selected ? "bg-ink text-white" : "bg-paper hover:bg-gold-100"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleTag(tag)}
                        className="sr-only"
                      />
                      {REVIEW_TAG_LABELS[tag]}
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <label className="block text-sm font-semibold">
              Comment <span className="font-normal text-mute">(optional)</span>
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                maxLength={MAX_COMMENT_LENGTH}
                rows={3}
                className="mt-1.5 w-full resize-none rounded-xl bg-paper px-4 py-3 font-normal outline-none ring-1 ring-transparent focus:ring-ink"
              />
              <span className="mt-1 block text-right text-xs font-normal text-mute">
                {comment.length}/{MAX_COMMENT_LENGTH}
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
                disabled={pending || rating === 0}
                className={`${buttonBase} bg-ink text-white hover:bg-ink/90 disabled:opacity-50`}
              >
                {pending ? "Sending…" : "Submit review"}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}