import z from "zod";
import { MAX_OPEN_QUESTS, MAX_QUEST_QUANTITY, MAX_QUEST_REWARD } from "./quests.config";

export const createQuestSchema=z.object({
    cardId:z.string().min(1),
    quantity:z.number().int().min(1).max(MAX_QUEST_QUANTITY),
    rewardGold:z.number().int().min(1).max(MAX_QUEST_REWARD)
})

export type CreateQuestInput = z.infer<typeof createQuestSchema>;
