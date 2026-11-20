import z from "zod";
import { GOLD_PACK_IDS, TEST_CARD_NUMBERS } from "./payments.config";

export const createPaymentSchema= z.object({
    packId:z.enum(GOLD_PACK_IDS),
    testCard:z.enum(TEST_CARD_NUMBERS),
    idempotencyKey:z.string().uuid()
})

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;