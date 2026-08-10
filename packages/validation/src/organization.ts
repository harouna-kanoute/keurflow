import { z } from "zod";
import { ORGANIZATION_ROLES, ORGANIZATION_TYPES } from "@keurflow/types";
import { uuidSchema } from "./common";

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  type: z.enum(ORGANIZATION_TYPES),
  countryId: uuidSchema,
});
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;

export const inviteOrganizationMemberSchema = z.object({
  organizationId: uuidSchema,
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(ORGANIZATION_ROLES).exclude(["owner"]),
});
export type InviteOrganizationMemberInput = z.infer<typeof inviteOrganizationMemberSchema>;
