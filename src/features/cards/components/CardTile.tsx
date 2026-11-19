import {
  ELEMENT_META,
  RARITY_META,
  formatCardNumber,
  type ElementName,
  type RarityName,
} from "../cards.meta";
import { CardArt } from "./CardArt";

type Props = {
  card: {
    number: number;
    name: string;
    element: ElementName;
    rarity: RarityName;
    imageUrl: string;
  };
  selected?: boolean; 
  owned?:number|null;
};

export function CardTile({ card, selected = false,owned=null }: Props) {
  const element = ELEMENT_META[card.element];
  const rarity = RARITY_META[card.rarity];
const locked = owned === 0;
  return (
    <article
      className={`overflow-hidden rounded-[28px] bg-white shadow-soft ${
        selected ? "ring-2 ring-gold-500" : ""
      }`}
    >
      <div
        className={`relative grid h-44 place-items-center overflow-hidden bg-linear-to-b ${element.stage}`}
      >
        <div
          aria-hidden
          className="absolute left-1/2 top-3 flex -translate-x-1/2 gap-1.5"
        >
          <span className={`block h-40 w-14 -skew-x-12 ${rarity.block}`} />
          <span className={`block h-40 w-5 -skew-x-12 ${rarity.block}`} />
        </div>
        <div className="relative grid h-32 w-32 place-items-center">
          <CardArt
            src={card.imageUrl}
            alt={card.name}
            number={card.number}
            element={card.element}
          />
        </div>
      </div>

        {owned != null && owned > 0 && (
          <span className="absolute left-3 top-3 rounded-full bg-ink px-2.5 py-1 text-xs font-bold text-white">
            {owned === 1 ? "Owned" : `Owned ×${owned}`}
          </span>
        )}

      <div className="px-5 pb-5 pt-4">
        <p className="text-xs font-semibold text-mute">N°{formatCardNumber(card.number)}</p>
        <h3 className="mt-0.5 font-display text-lg font-bold leading-tight">
          {card.name}
        </h3>

        <div className="mt-3 flex items-center justify-between">
          <span
            className={`rounded-md px-2.5 py-1 text-xs font-bold ${element.chip}`}
          >
            {element.label}
          </span>

          <span className="flex items-center gap-1" title={rarity.label}>
            <span className="sr-only">Rarity: {rarity.label}</span>
            {locked && <span className="sr-only">Not owned</span>}
            {Array.from({ length: 5 }, (_, i) => (
              <i
                key={i}
                aria-hidden
                className={`block size-1.5 rotate-45 ${
                  i < rarity.tier ? "bg-gold-500" : "bg-ink/15"
                }`}
              />
            ))}
          </span>
        </div>
      </div>
    </article>
  );
}