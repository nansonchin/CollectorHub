import type { ELEMENTS, RARITIES } from "./cards.schema";

export type ElementName = (typeof ELEMENTS)[number];
export type RarityName = (typeof RARITIES)[number];

export const ELEMENT_META: Record<
  ElementName,
  { label: string; chip: string; stage: string; numeral: string }
> = {
  FIRE: {
    label: "Fire",
    chip: "bg-[#FFE3D6] text-[#B8441A]",
    stage: "from-[#FFF1EA] to-[#FFD3BC]",
    numeral: "#E8825A",
  },
  WATER: {
    label: "Water",
    chip: "bg-[#D9EAFE] text-[#1F5FB0]",
    stage: "from-[#EEF5FF] to-[#C8DFFB]",
    numeral: "#5B9BE0",
  },
  EARTH: {
    label: "Earth",
    chip: "bg-[#E4EDCB] text-[#55701F]",
    stage: "from-[#F3F7E4] to-[#D5E3AE]",
    numeral: "#8FAE4F",
  },
  DARK: {
    label: "Dark",
    chip: "bg-[#E3DCF0] text-[#4A3A73]",
    stage: "from-[#F0ECF7] to-[#D2C8E6]",
    numeral: "#7B67A8",
  },
  LIGHT: {
    label: "Light",
    chip: "bg-[#FFF1BF] text-[#8A6A00]",
    stage: "from-[#FFF9DF] to-[#FBE6A0]",
    numeral: "#D9A91C",
  },
};

export const RARITY_META: Record<
  RarityName,
  { label: string; tier: number; block: string }
> = {
  COMMON: { label: "Common", tier: 1, block: "bg-gold-100" },
  RARE: { label: "Rare", tier: 2, block: "bg-gold-200" },
  EPIC: { label: "Epic", tier: 3, block: "bg-gold-400" },
  LEGENDARY: { label: "Legendary", tier: 4, block: "holo" },
  MYTHIC: { label: "Mythic", tier: 5, block: "holo-ink" },
};

export function formatCardNumber(number: number) {
  return String(number).padStart(3, "0");
}