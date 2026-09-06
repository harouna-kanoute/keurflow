import { z } from "zod";
import { SUPPLIER_STATUSES } from "@keurflow/types";
import { countryCodeSchema, phoneSchema, uuidSchema } from "./common";

// Optional free-text field that arrives from a form as "" when untouched:
// normalize to undefined so "left blank" never fails a min/format rule and
// never persists an empty string instead of NULL.
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `${max} caractères maximum`)
    .optional()
    .transform((v) => (v === "" ? undefined : v));

const optionalPhone = z
  .union([phoneSchema, z.literal("")])
  .optional()
  .transform((v) => (v === "" ? undefined : v));

const supplierFields = {
  name: z
    .string()
    .trim()
    .min(2, "2 caractères minimum")
    .max(160, "160 caractères maximum"),
  contactName: optionalText(160),
  phone: optionalPhone,
  whatsapp: optionalPhone,
  email: z
    .union([z.string().trim().toLowerCase().email("Email invalide").max(254), z.literal("")])
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  address: optionalText(240),
  city: optionalText(120),
  countryCode: countryCodeSchema,
  specialties: optionalText(240),
  notes: optionalText(2000),
};

export const createSupplierSchema = z.object({
  organizationId: uuidSchema,
  ...supplierFields,
});
export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;

export const updateSupplierSchema = z.object({
  supplierId: uuidSchema,
  ...supplierFields,
  status: z.enum(SUPPLIER_STATUSES),
});
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;

// Deactivating is its own action rather than a full-form update: it's the
// supported alternative to deleting a supplier that already has purchases.
export const updateSupplierStatusSchema = z.object({
  supplierId: uuidSchema,
  status: z.enum(SUPPLIER_STATUSES),
});
export type UpdateSupplierStatusInput = z.infer<typeof updateSupplierStatusSchema>;
