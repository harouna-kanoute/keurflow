import { z } from "zod";
import { PROJECT_ROLES, PROJECT_STATUSES } from "@keurflow/types";
import {
  amountMinorSchema,
  countryCodeSchema,
  currencyCodeSchema,
  isoDateSchema,
  uuidSchema,
} from "./common";

export const createProjectSchema = z.object({
  organizationId: uuidSchema,
  name: z.string().trim().min(2, "2 caractères minimum").max(120, "120 caractères maximum"),
  description: z.string().trim().max(2000, "2000 caractères maximum").optional(),
  projectType: z.string().trim().min(1).max(60),
  countryCode: countryCodeSchema,
  city: z.string().trim().max(120, "120 caractères maximum").optional(),
  address: z.string().trim().max(240, "240 caractères maximum").optional(),
  surfaceArea: z.number().positive().max(1_000_000).optional(),
  budgetMinor: amountMinorSchema,
  currencyCode: currencyCodeSchema,
  startDate: isoDateSchema.optional(),
  expectedEndDate: isoDateSchema.optional(),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const deleteProjectSchema = z.object({
  projectId: uuidSchema,
});
export type DeleteProjectInput = z.infer<typeof deleteProjectSchema>;

// Deliberately narrower than createProjectSchema: country/currency aren't
// editable after creation (changing them would desync every existing
// budget_minor/amount figure recorded in that currency).
export const updateProjectSchema = z.object({
  projectId: uuidSchema,
  name: z.string().trim().min(2, "2 caractères minimum").max(120, "120 caractères maximum"),
  projectType: z.string().trim().min(1).max(60),
  address: z.string().trim().max(240, "240 caractères maximum").optional(),
  surfaceArea: z.number().positive().max(1_000_000).optional(),
  budgetMinor: amountMinorSchema,
});
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

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
