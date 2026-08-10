import { z } from "zod";
import { PROJECT_ROLES, PROJECT_STATUSES } from "@keurflow/types";
import { amountMinorSchema, currencyCodeSchema, isoDateSchema, uuidSchema } from "./common";

export const createProjectSchema = z.object({
  organizationId: uuidSchema,
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional(),
  projectType: z.string().trim().min(1).max(60),
  countryId: uuidSchema,
  city: z.string().trim().max(120).optional(),
  budgetMinor: amountMinorSchema,
  currencyCode: currencyCodeSchema,
  startDate: isoDateSchema.optional(),
  expectedEndDate: isoDateSchema.optional(),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectStatusSchema = z.object({
  projectId: uuidSchema,
  status: z.enum(PROJECT_STATUSES),
});
export type UpdateProjectStatusInput = z.infer<typeof updateProjectStatusSchema>;

export const inviteProjectMemberSchema = z.object({
  projectId: uuidSchema,
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(PROJECT_ROLES).exclude(["project_owner"]),
});
export type InviteProjectMemberInput = z.infer<typeof inviteProjectMemberSchema>;
