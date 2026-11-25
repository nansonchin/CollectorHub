import z from "zod";
import { MAX_MESSAGE_LENGTH } from "./messages.config";

export const createConversationSchema = z.object({
  userId: z.string().min(1),
});

export const sendMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("TEXT"),
    body: z.string().min(1).max(MAX_MESSAGE_LENGTH),
  }),
  z.object({ type: z.literal("CARD"), cardId: z.string().min(1) }),
  z.object({ type: z.literal("TRADE_INVITE") }),
]);

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

