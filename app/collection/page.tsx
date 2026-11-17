import { listCards } from "@/src/features/cards/cards.service";
import { CardTile } from "@/src/features/cards/components/CardTile";

export const dynamic = "force-dynamic";

export default async function CollectionPage() {
  const { items, total } = await listCards({ page: 1, pageSize: 50 });

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
            <p className="mt-1 text-mute">{total} cards in the catalog</p>
          </header>

          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {items.map((card) => (
              <li key={card.id}>
                <CardTile card={card} />
              </li>
            ))}
          </ul>
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