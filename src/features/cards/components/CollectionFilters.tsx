import Link from "next/link";
import { Search } from "lucide-react";
import { ELEMENTS, RARITIES } from "../cards.schema";
import { ELEMENT_META, RARITY_META } from "../cards.meta";
import { filtersHref } from "../cards.url";

type Props = {
  q?: string;
  element?: string;
  rarity?: string;
  basePath?: string;
};

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

function Chip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors ${focusRing} ${
        active
          ? "bg-ink text-white"
          : "bg-white text-ink/70 shadow-soft hover:bg-gold-100"
      }`}
    >
      {children}
    </Link>
  );
}

function ChipRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex flex-wrap items-center gap-2"
    >
      <span className="w-16 text-sm font-semibold text-mute">{label}</span>
      {children}
    </div>
  );
}

export function CollectionFilters({
  q,
  element,
  rarity,
  basePath = "/collection",
}: Props) {
  const hasFilters = Boolean(q || element || rarity);

  return (
    <div>
      <form
        action={basePath}
        method="get"
        role="search"
        className="flex items-center gap-2 rounded-2xl bg-white p-2 pl-5 shadow-soft"
      >
        {element && <input type="hidden" name="element" value={element} />}
        {rarity && <input type="hidden" name="rarity" value={rarity} />}
        <input
          type="search"
          name="q"
          defaultValue={q}
          maxLength={50}
          placeholder="Search cards by name"
          aria-label="Search cards by name"
          className="h-11 min-w-0 flex-1 bg-transparent outline-none placeholder:text-mute"
        />
        <button
          type="submit"
          aria-label="Search"
          className={`grid size-11 shrink-0 place-items-center rounded-xl bg-gold-500 text-white ${focusRing}`}
        >
          <Search size={18} aria-hidden />
        </button>
      </form>

      <div className="mt-5 space-y-3">
        <ChipRow label="Element">
          <Chip href={filtersHref(basePath, { q, rarity })} active={!element}>
            All
          </Chip>
          {ELEMENTS.map((value) => (
            <Chip
              key={value}
              href={filtersHref(basePath, {
                q,
                rarity,
                //element already been selected. If select one more will be deactive
                element: element === value ? undefined : value,
              })}
              active={element === value}
            >
              <i
                aria-hidden
                className="block size-2 rounded-full"
                style={{ background: ELEMENT_META[value].numeral }}
              />
              {ELEMENT_META[value].label}
            </Chip>
          ))}
        </ChipRow>

        <ChipRow label="Rarity">
          <Chip href={filtersHref(basePath, { q, element })} active={!rarity}>
            All
          </Chip>
          {RARITIES.map((value) => (
            <Chip
              key={value}
              href={filtersHref(basePath, {
                q,
                element,
                rarity: rarity === value ? undefined : value,
              })}
              active={rarity === value}
            >
              {RARITY_META[value].label}
            </Chip>
          ))}
        </ChipRow>

        {hasFilters && (
          <Link
            href={basePath}
            className={`inline-block text-sm font-semibold underline underline-offset-4 ${focusRing}`}
          >
            Clear filters
          </Link>
        )}
      </div>
    </div>
  );
}
