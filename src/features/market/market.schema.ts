import z from "zod";

export const createListingSchema = z.object({
  cardId: z.string().min(1),
  quantity: z.number().int().min(1).max(99),
  unitPrice: z.number().int().min(1).max(1_000_000),
});

export type CreateListingInput = z.infer<typeof createListingSchema>;