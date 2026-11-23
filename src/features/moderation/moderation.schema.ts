import z from "zod";
import { MAX_ADMIN_TEXT, MAX_REPORT_DETAILS, REPORT_REASON_IDS, REPORT_TARGET_TYPES, RESOLVE_ACTION_IDS } from "./moderation.config";

const optionalText=(max:number)=>z.string().trim().max(max).optional().transform((value)=>(value?value:undefined))

export const createReportSchema = z.object({
    targetType:z.enum(REPORT_TARGET_TYPES),
    targetId:z.string().min(1),
    reason:z.enum(REPORT_REASON_IDS),
    details:optionalText(MAX_REPORT_DETAILS)
})
export type CreateReportInput = z.infer<typeof createReportSchema>
export const resolveReportSchema = z.object({
  action: z.enum(RESOLVE_ACTION_IDS),
  note: optionalText(MAX_ADMIN_TEXT),
  message: optionalText(MAX_ADMIN_TEXT),
});

export type ResolveReportInput = z.infer<typeof resolveReportSchema>;

