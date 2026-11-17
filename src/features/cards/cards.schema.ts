import z from "zod";

export const ELEMENTS = ["FIRE", "WATER", "EARTH", "DARK", "LIGHT"] as const;
export const RARITIES = ["COMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC"] as const;

export const listCardsQuerySchema = z.object({
  element: z.enum(ELEMENTS).optional(),
  rarity: z.enum(RARITIES).optional(),
  q: z.string().trim().min(1).max(50).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

export type ListCardsQuery = z.infer<typeof listCardsQuerySchema>;
