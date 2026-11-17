import { Pagination } from "@/src/components/ui/Pagination";
import { listCardsQuerySchema, parseListCardsQuery } from "@/src/features/cards/cards.schema";
import { listCards } from "@/src/features/cards/cards.service";
import { collectionHref } from "@/src/features/cards/cards.url";
import { CardTile } from "@/src/features/cards/components/CardTile";
import { CollectionFilters } from "@/src/features/cards/components/CollectionFilters";
import Link from "next/link";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function CollectionPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const parsed = parseListCardsQuery(await searchParams);

  const query = parsed.success ? parsed.data : listCardsQuerySchema.parse({});

  const { items, total, page, pageSize, totalPages } = await listCards(query);

  const { q, element, rarity } = query;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

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
                  {items.map((card) => (
                    <li key={card.id}>
                      <CardTile card={card} />
                    </li>
                  ))}
                </ul>

                <div className="mt-10">
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    hrefFor={(p) => collectionHref({ q, element, rarity, page: p })}
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
                  className="mt-5 inline-flex h-11 items-center rounded-full bg-ink px-6 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                >
                  {total === 0 ? "Clear filters" : "Go to page 1"}
                </Link>
              </div>
            )}
          </div>
        </section>

        <aside className="hidden lg:block">
          <div className="sticky top-6 rounded-[32px] bg-white p-6 shadow-soft">
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
        </aside>
      </div>
    </div>
  );
}