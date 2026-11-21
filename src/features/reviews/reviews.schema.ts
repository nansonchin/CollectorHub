import z from "zod";
import { MAX_COMMENT_LENGTH, MAX_REVIEW_TAGS, REVIEW_TAG_IDS } from "./reviews.config";

export const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  tags: z.array(z.enum(REVIEW_TAG_IDS)).max(MAX_REVIEW_TAGS).default([]),
  comment: z
    .string()
    .trim()
    .max(MAX_COMMENT_LENGTH)
    .optional()
    .transform((value) => (value ? value : undefined)),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;