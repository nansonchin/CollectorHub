import { Pagination } from "@/src/components/ui/Pagination";
import {
  listCardsQuerySchema,
  parseListCardsQuery,
} from "@/src/features/cards/cards.schema";
import { marketHref } from "@/src/features/cards/cards.url";
import { CardTile } from "@/src/features/cards/components/CardTile";
import { CollectionFilters } from "@/src/features/cards/components/CollectionFilters";
import { getWalletBalance } from "@/src/features/economy/economy.service";
import { BuyDialog } from "@/src/features/market/components/BuyDialog";
import { ReleaseButton } from "@/src/features/market/components/ReleaseButton";
import { ReserveButton } from "@/src/features/market/components/ReserveButton";
import {
  listMarketListings,
  tryExpireStaleReservation,
} from "@/src/features/market/market.service";
import { getSession } from "@/src/lib/session";
import { formatTimeLeft } from "@/src/lib/time";
import Link from "next/link";

export const metadata = { title: "Market · CollectorHub" };

type SearchParams = Record<string, string | string[] | undefined>;

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

export default async function MarketPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const parsed = parseListCardsQuery(await searchParams);
  const query = parsed.success ? parsed.data : listCardsQuerySchema.parse({});
  const { q, element, rarity } = query;

  await tryExpireStaleReservation();
  const session = await getSession();

  const [list, balance] = await Promise.all([
    listMarketListings(query),
    session ? getWalletBalance(session.user.id) : Promise.resolve(null),
  ]);

  const { items, total, page, pageSize, totalPages } = list;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="relative overflow-x-clip">
      <span
        aria-hidden
        className="pointer-events-none absolute -left-2 -top-6 select-none font-display text-[9rem] font-extrabold leading-none text-white md:text-[16rem]"
      >
        Market
      </span>

      <div className="relative">
        <header className="mb-6">
          <h1 className="font-display text-4xl font-extrabold">Market</h1>
          <p className="mt-1 text-mute">
            {items.length > 0
              ? `Showing ${from}–${to} of ${total} ${total === 1 ? "listing" : "listings"}`
              : "No listings to show"}
          </p>
        </header>

        <CollectionFilters
          q={q}
          element={element}
          rarity={rarity}
          basePath="/market"
        />

        <div className="mt-8">
          {items.length > 0 ? (
            <>
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {items.map((listing) => {
                  const total = listing.quantity * listing.unitPrice;
                  const isMine = session?.user.id === listing.sellerId;

                  const reservation = listing.reservations[0];
                  const reservedByMe =
                    reservation !== undefined &&
                    reservation.buyerId === session?.user.id;

                  let action: React.ReactNode;

                  if (isMine) {
                    action = (
                      <p className="flex h-10 items-center justify-center rounded-full bg-paper text-sm font-semibold text-mute">
                        {reservation
                          ? "Your listing · reserved"
                          : "Your listing"}
                      </p>
                    );
                  } else if (!session || balance === null) {
                    action = (
                      <Link
                        href="/sign-in"
                        className={`flex h-10 items-center justify-center rounded-full bg-paper text-sm font-semibold hover:bg-gold-100 ${focusRing}`}
                      >
                        Sign in to buy
                      </Link>
                    );
                  } else if (reservation && reservedByMe) {
                    action = (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-[#7a5a10]">
                          Reserved for you ·{" "}
                          {formatTimeLeft(reservation.expiresAt)} left
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <BuyDialog
                            listingId={listing.id}
                            cardName={listing.card.name}
                            quantity={listing.quantity}
                            total={total}
                            balance={balance}
                          />
                          <ReleaseButton reservationId={reservation.id} />
                        </div>
                      </div>
                    );
                  } else if (reservation) {
                    action = (
                      <p className="flex h-10 items-center justify-center rounded-full bg-paper text-sm font-semibold text-mute">
                        Reserved · {formatTimeLeft(reservation.expiresAt)} left
                      </p>
                    );
                  } else {
                    action = (
                      <div className="grid grid-cols-2 gap-2">
                        <ReserveButton listingId={listing.id} />
                        <BuyDialog
                          listingId={listing.id}
                          cardName={listing.card.name}
                          quantity={listing.quantity}
                          total={total}
                          balance={balance}
                        />
                      </div>
                    );
                  }

                  return (
                    <li key={listing.id}>
                      <CardTile card={listing.card} />

                      <div className="mt-3 px-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="font-display text-xl font-bold">
                            {total.toLocaleString("en-US")}{" "}
                            <span className="text-sm font-semibold text-mute">
                              Gold
                            </span>
                          </p>
                          {listing.quantity > 1 && (
                            <p className="text-sm font-semibold">
                              ×{listing.quantity}
                            </p>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-mute">
                          {listing.quantity > 1 &&
                            `${listing.unitPrice.toLocaleString("en-US")} each · `}
                          by {listing.seller.name}
                        </p>

                        <div className="mt-3">{action}</div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-10">
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  hrefFor={(p) => marketHref({ q, element, rarity, page: p })}
                />
              </div>
            </>
          ) : (
            <div className="rounded-[28px] bg-white p-10 text-center shadow-soft">
              <h2 className="font-display text-xl font-bold">
                {total === 0
                  ? "Nothing for sale here"
                  : "That page doesn't exist"}
              </h2>
              <p className="mt-1 text-mute">
                {total === 0
                  ? "Try a different name, remove a filter, or list a card of your own."
                  : `This list only has ${totalPages} ${totalPages === 1 ? "page" : "pages"}.`}
              </p>
              <Link
                href={
                  total === 0 ? "/market" : marketHref({ q, element, rarity })
                }
                className={`mt-5 inline-flex h-11 items-center rounded-full bg-ink px-6 text-sm font-semibold text-white ${focusRing}`}
              >
                {total === 0 ? "Clear filters" : "Go to page 1"}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
