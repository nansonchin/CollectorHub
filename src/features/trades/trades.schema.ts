import z from "zod";
import { MAX_ITEMS_PER_SIDE, MAX_TRADE_MESSAGE } from "./trades.config";

const itemSchema=z.object({
    cardId:z.string().min(1),
    quantity:z.number().int().min(1).max(99)
})

const hasUniqueCards=(items:{
    cardId:string
}[])=> new Set(items.map((item)=>item.cardId)).size === items.length

export const createTradeSchema = z
  .object({
    recipientId: z.string().min(1),
    offerItems: z.array(itemSchema).max(MAX_ITEMS_PER_SIDE),
    requestItems: z.array(itemSchema).max(MAX_ITEMS_PER_SIDE),
    offeredGold: z.number().int().min(0).max(1_000_000),
    requestedGold: z.number().int().min(0).max(1_000_000),
    message: z
      .string()
      .trim()
      .max(MAX_TRADE_MESSAGE)
      .optional()
      .transform((value) => (value ? value : undefined)),
  })
  .refine((trade) => trade.offerItems.length + trade.requestItems.length > 0, {
    message: "A trade must include at least one card.",
  })
  .refine((trade) => trade.offerItems.length > 0 || trade.offeredGold > 0, {
    message: "You must offer something.",
  })
  .refine((trade) => trade.requestItems.length > 0 || trade.requestedGold > 0, {
    message: "You must ask for something.",
  })
  .refine((trade) => hasUniqueCards(trade.offerItems) && hasUniqueCards(trade.requestItems), {
    message: "Each card can only appear once per side.",
  });

export type CreateTradeInput = z.infer<typeof createTradeSchema>;
