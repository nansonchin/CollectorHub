import { ReportDialog } from "@/src/features/moderation/components/ReportDialog";
import { getPlayerProfile } from "@/src/features/players/players.service";
import { Stars } from "@/src/features/reviews/components/Stars";
import { REVIEW_TAG_LABELS, ReviewTagId } from "@/src/features/reviews/reviews.config";
import { formatDateML } from "@/src/lib/date";
import { getSession } from "@/src/lib/session";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const profile = await getPlayerProfile(id);
  return { title: profile ? `${profile.user.name} · CollectorHub` : "Player not found" };
}
export default async function PlayerPage({ params }: Props) {
  const { id } = await params;
  const profile = await getPlayerProfile(id);

  if (!profile) notFound();

  const { user, tradeCount, ratingAverage, ratingCount, reviews } = profile;

  const session = await getSession();
  const viewerId = session?.user.id ?? null;

  return (
    <div className="relative overflow-x-clip">
      <div className="relative mx-auto max-w-3xl">
        <header className="mb-6">
          <h1 className="font-display text-4xl font-extrabold">{user.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
            <p className="text-mute">Member since {formatDateML(user.createdAt)}</p>
            {viewerId && viewerId !== user.id && (
              <ReportDialog targetType="USER" targetId={user.id} subject={user.name} />
            )}
          </div>
        </header>

        <section
          aria-label="Player statistics"
          className="grid gap-3 rounded-[32px] bg-white p-6 shadow-soft sm:grid-cols-2 sm:p-8"
        >
          <div className="rounded-2xl bg-paper px-5 py-4">
            <p className="text-sm font-semibold text-mute">Rating</p>
            {ratingAverage !== null ? (
              <>
                <p className="mt-1 font-display text-4xl font-extrabold leading-none">
                  {ratingAverage.toFixed(1)}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Stars value={ratingAverage} />
                  <span className="text-sm text-mute">
                    {ratingCount} {ratingCount === 1 ? "review" : "reviews"}
                  </span>
                </div>
              </>
            ) : (
              <p className="mt-2 text-mute">No reviews yet</p>
            )}
          </div>

          <div className="rounded-2xl bg-paper px-5 py-4">
            <p className="text-sm font-semibold text-mute">Completed trades</p>
            <p className="mt-1 font-display text-4xl font-extrabold leading-none">
              {tradeCount}
            </p>
          </div>
        </section>

        <section aria-labelledby="reviews-heading" className="mt-10">
          <h2 id="reviews-heading" className="font-display text-2xl font-bold">
            Reviews
          </h2>

          {reviews.length > 0 ? (
            <ul className="mt-5 space-y-3">
              {reviews.map((review) => (
                <li key={review.id} className="rounded-[28px] bg-white px-6 py-5 shadow-soft">
                  <div className="flex items-center justify-between gap-3">
                    <Stars value={review.rating} />
                    <div className="flex items-center gap-3">
                      <p className="text-sm text-mute">
                        {review.reviewer.name} · {formatDateML(review.createdAt)}
                      </p>
                      {viewerId && review.reviewer.id !== viewerId && (
                        <ReportDialog
                          targetType="REVIEW"
                          targetId={review.id}
                          subject="this review"
                        />
                      )}
                    </div>
                  </div>

                  {review.tags.length > 0 && (
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {review.tags.map((tag) => (
                        <li
                          key={tag}
                          className="rounded-md bg-gold-100 px-2.5 py-1 text-xs font-bold text-[#7a5a10]"
                        >
                          {REVIEW_TAG_LABELS[tag as ReviewTagId] ?? tag}
                        </li>
                      ))}
                    </ul>
                  )}

                  {review.comment && (
                    <p className="mt-3 whitespace-pre-line text-ink/80">{review.comment}</p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 text-mute">This player has not received any reviews yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}
