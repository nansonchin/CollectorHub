import Link from "next/link";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  ELEMENT_META,
  RARITY_META,
  formatCardNumber,
  type ElementName,
  type RarityName,
} from "../cards.meta";
import { CardArt } from "./CardArt";

const MAX_STAT = 400;

type Neighbor = { number: number; name: string; href: string } | null;

type Props = {
  card: {
    number: number;
    name: string;
    description: string;
    element: ElementName;
    rarity: RarityName;
    attack: number;
    defense: number;
    imageUrl: string;
  };
  previous: Neighbor;
  next: Neighbor;
  closeHref: string;
};

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

function Stat({ label, value }: { label: string; value: number }) {
  const ratio = Math.min(value / MAX_STAT, 1);

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold text-mute">{label}</span>
        <span className="font-display text-xl font-bold">{value}</span>
      </div>
      <div
        role="img"
        aria-label={`${label} ${value} out of ${MAX_STAT}`}
        className="mt-1.5 h-2 overflow-hidden rounded-full bg-paper"
      >
        <div
          className="h-full rounded-full bg-gold-500"
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}

export function CardDetailPanel({ card, previous, next, closeHref }: Props) {
  const element = ELEMENT_META[card.element];
  const rarity = RARITY_META[card.rarity];

  return (
    <section
      aria-label={`${card.name} details`}
      className="relative rounded-t-[32px] bg-white p-6 shadow-soft lg:rounded-[32px]"
    >
      <Link
        href={closeHref}
        scroll={false}
        aria-label="Close details"
        className={`absolute right-4 top-4 z-10 grid size-9 place-items-center rounded-full bg-white/90 text-ink shadow-soft hover:bg-gold-100 ${focusRing}`}
      >
        <X size={18} aria-hidden />
      </Link>

      <div
        className={`relative grid h-64 place-items-center overflow-hidden rounded-2xl bg-linear-to-b ${element.stage}`}
      >
        <span aria-hidden className="ruler absolute inset-y-4 left-3 w-2" />
        <div
          aria-hidden
          className="absolute left-1/2 top-4 flex -translate-x-1/2 gap-2"
        >
          <span className={`block h-56 w-20 -skew-x-12 ${rarity.block}`} />
          <span className={`block h-56 w-7 -skew-x-12 ${rarity.block}`} />
        </div>
        <div className="relative grid h-48 w-48 place-items-center">
          <CardArt
            key={card.number}
            src={card.imageUrl}
            alt={card.name}
            number={card.number}
            element={card.element}
          />
        </div>
      </div>

      <p className="mt-5 text-xs font-semibold text-mute">
        N°{formatCardNumber(card.number)}
      </p>
      <h2 className="mt-0.5 font-display text-2xl font-extrabold leading-tight">
        {card.name}
      </h2>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className={`rounded-md px-2.5 py-1 text-xs font-bold ${element.chip}`}>
          {element.label}
        </span>
        <span className="rounded-md bg-gold-100 px-2.5 py-1 text-xs font-bold text-[#7a5a10]">
          {rarity.label}
        </span>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-ink/80">{card.description}</p>

      <div className="mt-6 space-y-4">
        <Stat label="Attack" value={card.attack} />
        <Stat label="Defense" value={card.defense} />
      </div>

      <nav
        aria-label="Browse cards"
        className="mt-6 flex items-center justify-between gap-2 rounded-2xl bg-paper px-3 py-2 text-sm"
      >
        {previous ? (
          <Link
            href={previous.href}
            scroll={false}
            className={`flex min-w-0 items-center gap-1 rounded-lg py-1 pr-2 font-semibold hover:text-gold-500 ${focusRing}`}
          >
            <ChevronLeft size={16} aria-hidden className="shrink-0" />
            <span className="truncate">{previous.name}</span>
            <span className="shrink-0 font-normal text-mute">
              #{formatCardNumber(previous.number)}
            </span>
          </Link>
        ) : (
          <span />
        )}

        {next ? (
          <Link
            href={next.href}
            scroll={false}
            className={`flex min-w-0 items-center gap-1 rounded-lg py-1 pl-2 font-semibold hover:text-gold-500 ${focusRing}`}
          >
            <span className="shrink-0 font-normal text-mute">
              #{formatCardNumber(next.number)}
            </span>
            <span className="truncate">{next.name}</span>
            <ChevronRight size={16} aria-hidden className="shrink-0" />
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </section>
  );
}