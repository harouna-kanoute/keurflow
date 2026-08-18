import { z } from "zod";
import { ORGANIZATION_ROLES, ORGANIZATION_TYPES } from "@keurflow/types";
import { countryCodeSchema, uuidSchema } from "./common";

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2, "2 caractères minimum").max(120, "120 caractères maximum"),
  type: z.enum(ORGANIZATION_TYPES),
  countryCode: countryCodeSchema,
});
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;

// Contact details only — type/country aren't editable here (they ripple
// into billing/dashboard-rendering decisions elsewhere, out of scope for a
// simple "fix our address" edit). Phone is a general business contact
// number, not tied to WhatsApp deep-linking like profiles.phone, so it only
// gets a loose length check rather than the strict E.164-ish regex.
export const updateOrganizationSchema = z.object({
  organizationId: uuidSchema,
  name: z.string().trim().min(2, "2 caractères minimum").max(120, "120 caractères maximum"),
  address: z.string().trim().max(240, "240 caractères maximum").optional(),
  phone: z.string().trim().min(6, "6 caractères minimum").max(30, "30 caractères maximum").optional(),
  email: z.string().trim().toLowerCase().email("Email invalide").optional(),
});
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;

export const inviteOrganizationMemberSchema = z.object({
  organizationId: uuidSchema,
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(ORGANIZATION_ROLES).exclude(["owner"]),
});
export type InviteOrganizationMemberInput = z.infer<typeof inviteOrganizationMemberSchema>;
