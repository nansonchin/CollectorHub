import { Pagination } from "@/src/components/ui/Pagination";
import { listCardsQuerySchema, parseCardNumber, parseListCardsQuery } from "@/src/features/cards/cards.schema";
import { getCardDetail, listCards } from "@/src/features/cards/cards.service";
import { collectionHref } from "@/src/features/cards/cards.url";
import { CardDetailPanel } from "@/src/features/cards/components/CardDetailPanel";
import { CardTile } from "@/src/features/cards/components/CardTile";
import { CollectionFilters } from "@/src/features/cards/components/CollectionFilters";
import { getOwnedQuantities } from "@/src/features/economy/economy.service";
import { getSession } from "@/src/lib/session";
import Link from "next/link";

type SearchParams = Record<string, string | string[] | undefined>;

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

export default async function CollectionPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const parsed = parseListCardsQuery(params);

  const query = parsed.success ? parsed.data : listCardsQuerySchema.parse({});
  const { q, element, rarity } = query;

  const selectedNumber = parseCardNumber(params.card);

  const [list, detail] = await Promise.all([
    listCards(query),
    selectedNumber
      ? getCardDetail(selectedNumber, { q, element, rarity }, query.pageSize)
      : Promise.resolve(null),
  ]);

  const { items, total, page, pageSize, totalPages } = list;
  const session = await getSession()
  const ownedByCardId = session ? await getOwnedQuantities(session.user.id,[
    ...items.map((card)=>card.id),
    ...(detail?[detail.card.id]:[])
  ]):null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const linkTo = (overrides: { page?: number; card?: number } = {}) =>
    collectionHref({ q, element, rarity, page, ...overrides });

  return (
    <div className="relative overflow-x-clip">
      <span
        aria-hidden
        className="pointer-events-none absolute -left-2 -top-6 select-none font-display text-[9rem] font-extrabold leading-none text-white md:text-[16rem]"
      >
        Cards
      </span>

      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section>
          <header className="mb-6">
            <h1 className="font-display text-4xl font-extrabold">Collection</h1>
            <p className="mt-1 text-mute">
              {items.length > 0
                ? `Showing ${from}–${to} of ${total} cards`
                : "No cards to show"}
            </p>
          </header>

          <CollectionFilters q={q} element={element} rarity={rarity} />

          <div className="mt-8">
            {items.length > 0 ? (
              <>
                <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {items.map((card) => {
                    const selected = card.number === detail?.card.number;
                    return (
                      <li key={card.id}>
                        <Link
                          href={linkTo({ card: card.number })}
                          scroll={false}
                          aria-current={selected ? "true" : undefined}
                          className={`block rounded-[28px] ${focusRing}`}
                        >
                          <CardTile card={card} selected={selected} owned={ownedByCardId? (ownedByCardId.get(card.id)??0):null}/>
                        </Link>
                      </li>
                    );
                  })}
                </ul>

                <div className="mt-10">
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    hrefFor={(p) => linkTo({ page: p })}
                  />
                </div>
              </>
            ) : (
              <div className="rounded-[28px] bg-white p-10 text-center shadow-soft">
                <h2 className="font-display text-xl font-bold">
                  {total === 0
                    ? "No cards match these filters"
                    : "That page doesn't exist"}
                </h2>
                <p className="mt-1 text-mute">
                  {total === 0
                    ? "Try a different name, or remove a filter."
                    : `This list only has ${totalPages} ${totalPages === 1 ? "page" : "pages"}.`}
                </p>
                <Link
                  href={total === 0 ? "/collection" : collectionHref({ q, element, rarity })}
                  className={`mt-5 inline-flex h-11 items-center rounded-full bg-ink px-6 text-sm font-semibold text-white ${focusRing}`}
                >
                  {total === 0 ? "Clear filters" : "Go to page 1"}
                </Link>
              </div>
            )}
          </div>
        </section>

        <aside
          className={`lg:sticky lg:top-6 lg:self-start ${
            detail
              ? "fixed inset-x-0 bottom-0 z-30 max-h-[85vh] overflow-y-auto lg:inset-x-auto lg:bottom-auto lg:z-auto lg:max-h-none lg:overflow-visible"
              : "hidden lg:block"
          }`}
        >
          {detail ? (
            <CardDetailPanel
              card={detail.card}
              previous={
                detail.previous && {
                  number: detail.previous.number,
                  name: detail.previous.name,
                  href: linkTo({ page: detail.previous.page, card: detail.previous.number }),
                }
              }
              next={
                detail.next && {
                  number: detail.next.number,
                  name: detail.next.name,
                  href: linkTo({ page: detail.next.page, card: detail.next.number }),
                }
              }
              closeHref={linkTo()}
              owned={ownedByCardId ? (ownedByCardId.get(detail.card.id) ?? 0) : null}
            />
          ) : (
            <div className="rounded-[32px] bg-white p-6 shadow-soft">
              <div className="relative h-56 overflow-hidden rounded-2xl bg-linear-to-b from-[#f8f8fa] to-[#ecedf2]">
                <span aria-hidden className="ruler absolute inset-y-4 left-3 w-2" />
                <div
                  aria-hidden
                  className="absolute left-1/2 top-4 flex -translate-x-1/2 gap-1.5"
                >
                  <span className="block h-48 w-14 -skew-x-12 bg-gold-200" />
                  <span className="block h-48 w-5 -skew-x-12 bg-gold-400" />
                </div>
              </div>
              <h2 className="mt-5 font-display text-xl font-bold">Card details</h2>
              <p className="mt-1 text-sm text-mute">
                Choose a card from the grid to see its stats here.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}