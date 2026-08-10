import { z } from "zod";
import { MILESTONE_STATUSES } from "@keurflow/types";
import { amountMinorSchema, isoDateSchema, uuidSchema } from "./common";

export const createMilestoneSchema = z.object({
  projectId: uuidSchema,
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).optional(),
  orderIndex: z.number().int().nonnegative(),
  plannedDate: isoDateSchema.optional(),
  budgetMinor: amountMinorSchema.optional(),
});
export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>;

export const updateMilestoneStatusSchema = z.object({
  milestoneId: uuidSchema,
  status: z.enum(MILESTONE_STATUSES),
  completedDate: isoDateSchema.optional(),
});
export type UpdateMilestoneStatusInput = z.infer<typeof updateMilestoneStatusSchema>;
