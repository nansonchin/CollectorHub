import { formatCardNumber, RARITY_META } from "@/src/features/cards/cards.meta";
import { collectionHref } from "@/src/features/cards/cards.url";
import { CardTile } from "@/src/features/cards/components/CardTile";
import { getInventoryOverview } from "@/src/features/economy/economy.service";
import { CancelListingButton } from "@/src/features/market/components/CancelListingButton";
import { SellDialog } from "@/src/features/market/components/SellDialog";
import { listMyListings } from "@/src/features/market/market.service";
import { getSession } from "@/src/lib/session";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = { title: "Inventory · CollectorHub" };

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

export default async function InventoryPage() {

  const session = await getSession();
  if (!session) redirect("/sign-in");

  // 两个查询互不依赖，同时发出
  const [overview, listings] = await Promise.all([
    getInventoryOverview(session.user.id),
    listMyListings(session.user.id),
  ]);

  const { items, ownedCards, totalCards, copies, byRarity } = overview;
  const percent = totalCards === 0 ? 0 : Math.round((ownedCards / totalCards) * 100);

  return (
    <div className="relative overflow-x-clip">
      <span
        aria-hidden
        className="pointer-events-none absolute -left-2 -top-6 select-none font-display text-[9rem] font-extrabold leading-none text-white md:text-[16rem]"
      >
        Mine
      </span>

      <div className="relative">
        <header className="mb-6">
          <h1 className="font-display text-4xl font-extrabold">Inventory</h1>
          <p className="mt-1 text-mute">
            {copies} {copies === 1 ? "card" : "cards"} in total, {ownedCards} different
          </p>
        </header>

        <section
          aria-label="Collection progress"
          className="rounded-[32px] bg-white p-6 shadow-soft sm:p-8"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <p className="font-display text-5xl font-extrabold leading-none">
              {ownedCards}
              <span className="text-mute"> / {totalCards}</span>
            </p>
            <p className="text-sm font-semibold text-mute">
              {percent}% of the catalog collected
            </p>
          </div>

          <div
            role="img"
            aria-label={`${ownedCards} of ${totalCards} cards collected`}
            className="mt-5 h-3 overflow-hidden rounded-full bg-paper"
          >
            <div
              className="h-full rounded-full bg-gold-500"
              style={{ width: `${percent}%` }}
            />
          </div>

          <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {byRarity.map(({ rarity, owned, total }) => (
              <li key={rarity} className="rounded-2xl bg-paper px-4 py-3">
                <p className="text-sm font-semibold text-mute">
                  {RARITY_META[rarity].label}
                </p>
                <p className="mt-0.5 font-display text-xl font-bold">
                  {owned}
                  <span className="text-mute"> / {total}</span>
                </p>
              </li>
            ))}
          </ul>
        </section>

        {listings.length > 0 && (
          <section aria-labelledby="listings-heading" className="mt-10">
            <h2 id="listings-heading" className="font-display text-2xl font-bold">
              Your listings
            </h2>
            <ul className="mt-5 space-y-3">
              {listings.map((listing) => (
                <li
                  key={listing.id}
                  className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-[28px] bg-white px-6 py-4 shadow-soft"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-lg font-bold">{listing.card.name}</p>
                    <p className="text-sm text-mute">
                      N°{formatCardNumber(listing.card.number)} · ×{listing.quantity} at{" "}
                      {listing.unitPrice.toLocaleString("en-US")} Gold each
                    </p>
                  </div>
                  <p className="font-display text-xl font-bold">
                    {(listing.quantity * listing.unitPrice).toLocaleString("en-US")}{" "}
                    <span className="text-sm font-semibold text-mute">Gold</span>
                  </p>
                  <CancelListingButton listingId={listing.id} />
                </li>
              ))}
            </ul>
          </section>
        )}

        <h2 className="mt-10 font-display text-2xl font-bold">Your cards</h2>

        {items.length > 0 ? (
          <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => {
              const available = item.quantity - item.reservedQuantity;
              return (
                <li key={item.id}>
                  <Link
                    href={collectionHref({ card: item.card.number })}
                    className={`block rounded-[28px] ${focusRing}`}
                  >
                    <CardTile
                      card={item.card}
                      owned={item.quantity > 1 ? item.quantity : null}
                    />
                  </Link>
                  <div className="mt-3 flex items-center justify-between gap-2 px-1">
                    <p className="text-sm text-mute">
                      {available} available
                      {item.reservedQuantity > 0 && ` · ${item.reservedQuantity} listed`}
                    </p>
                    <SellDialog
                      cardId={item.card.id}
                      cardName={item.card.name}
                      available={available}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-5 rounded-[28px] bg-white p-10 text-center shadow-soft">
            <h3 className="font-display text-xl font-bold">Your inventory is empty</h3>
            <p className="mt-1 text-mute">
              Browse the collection to see which cards are out there.
            </p>
            <Link
              href="/collection"
              className={`mt-5 inline-flex h-11 items-center rounded-full bg-ink px-6 text-sm font-semibold text-white ${focusRing}`}
            >
              Open collection
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}