import z from "zod";

export const ELEMENTS = ["FIRE", "WATER", "EARTH", "DARK", "LIGHT"] as const;
export const RARITIES = [
  "COMMON",
  "RARE",
  "EPIC",
  "LEGENDARY",
  "MYTHIC",
] as const;

export const listCardsQuerySchema = z.object({
  element: z.enum(ELEMENTS).optional(),
  rarity: z.enum(RARITIES).optional(),
  q: z.string().trim().min(1).max(50).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

export type ListCardsQuery = z.infer<typeof listCardsQuerySchema>;

type RawQuery = Record<string, string | string[] | undefined>;

export function parseListCardsQuery(input: RawQuery) {
  console.log(input);
  const cleaned: Record<string, string> = {};

  for (const [key, raw] of Object.entries(input)) {
    const value = (Array.isArray(raw) ? raw[0] : raw)?.trim();
    if (value) {
      cleaned[key] = value;
    }
  }
  return listCardsQuerySchema.safeParse(cleaned);
}

export const cardNumberSchema = z.coerce.number().int().min(1);

export function parseCardNumber(raw: string | string[] | undefined) {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const result = cardNumberSchema.safeParse(value);
  return result.success ? result.data : null;
}


