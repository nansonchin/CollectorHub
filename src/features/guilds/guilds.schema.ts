import z from "zod";
import {
    MAX_ANNOUNCEMENT,
  MAX_GUILD_DESCRIPTION,
  MAX_GUILD_NAME,
  MAX_REQUEST_MESSAGE,
  MIN_GUILD_NAME,
} from "./guilds.config";
import { MAX_REPORTS_PER_DAY } from "../moderation/moderation.config";

const nameSchema = z
  .string()
  .trim()
  .min(MIN_GUILD_NAME)
  .max(MAX_GUILD_NAME)
  .regex(
    /^[\p{L}\p{N} _'-]+$/u,
    "Use letters, numbers, spaces, - _ and ' only.",
  );

export const createGuildSchema = z.object({
  name: nameSchema,
  description: z
    .string()
    .trim()
    .max(MAX_GUILD_DESCRIPTION)
    .optional()
    .transform((value) => (value ? value : undefined)),
});

export type CreateGuildInput = z.infer<typeof createGuildSchema>;

export const updateGuildSchema = z
  .object({
    description: z.string().trim().max(MAX_GUILD_DESCRIPTION).optional(),
    announcement: z.string().trim().max(MAX_ANNOUNCEMENT).optional(),
  })
  .refine((data) => data.description !== undefined || data.announcement !== undefined, {
    message: "Nothing to update.",
  });

  
export type UpdateGuildInput = z.infer<typeof updateGuildSchema>;

export const joinRequestSchema=z.object({
    message:z.string().trim().max(MAX_REQUEST_MESSAGE).optional().transform((value)=>value?value:undefined)
})

export const memberActionSchema = z.object({
    action:z.enum(["kick","promote","demote","transfer"])
})

export type MemberAction = z.infer<typeof memberActionSchema>["action"];


export const requestActionSchema = z.object({
  action: z.enum(["approve", "reject"]),
});

export const listGuildsQuerySchema = z.object({
  q: z.string().trim().min(1).max(50).optional(),
  page: z.coerce.number().int().min(1).default(1),
});