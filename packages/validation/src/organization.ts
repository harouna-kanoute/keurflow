import { z } from "zod";
import { ORGANIZATION_ROLES, ORGANIZATION_TYPES } from "@keurflow/types";
import { countryCodeSchema, uuidSchema } from "./common";

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2, "2 caractères minimum").max(120, "120 caractères maximum"),
  type: z.enum(ORGANIZATION_TYPES),
  countryCode: countryCodeSchema,
});
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;

export const inviteOrganizationMemberSchema = z.object({
  organizationId: uuidSchema,
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(ORGANIZATION_ROLES).exclude(["owner"]),
});
export type InviteOrganizationMemberInput = z.infer<typeof inviteOrganizationMemberSchema>;
