import { z } from "zod";
import {
  amountMinorSchema,
  currencyCodeSchema,
  isoDateSchema,
  paymentMethodCodeSchema,
  uuidSchema,
} from "./common";

const purchaseFields = {
  supplierId: uuidSchema,
  materialCode: z.string().trim().min(1).max(40),
  // Required only when materialCode is "other" — enforced by the refine below.
  materialName: z
    .string()
    .trim()
    .max(160, "160 caractères maximum")
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  description: z
    .string()
    .trim()
    .max(500, "500 caractères maximum")
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  purchaseDate: isoDateSchema,
  quantity: z.number().positive("Quantité requise").max(1_000_000),
  unit: z.string().trim().min(1).max(20),
  unitPriceMinor: amountMinorSchema,
  currencyCode: currencyCodeSchema,
  paymentMethodCode: paymentMethodCodeSchema.optional(),
  // Link to an existing expense. Mutually exclusive with createExpense below —
  // an achat is reconciled against one expense, never two.
  expenseId: uuidSchema.optional(),
};

// No totalAmountMinor field at all: the total is quantity × unitPrice,
// recomputed server-side (and again by a DB trigger), never accepted from the
// client — same zero-trust rule as expense items.
const materialNameRequiredForOther = (data: { materialCode: string; materialName?: string }) =>
  data.materialCode !== "other" || !!data.materialName;

const MATERIAL_NAME_ISSUE = {
  message: "Précisez le matériau",
  path: ["materialName"],
};

export const createPurchaseSchema = z
  .object({
    projectId: uuidSchema,
    ...purchaseFields,
    // Create a matching expense for this purchase instead of linking one.
    createExpense: z.boolean().optional(),
  })
  .refine(materialNameRequiredForOther, MATERIAL_NAME_ISSUE)
  .refine((data) => !(data.expenseId && data.createExpense), {
    message: "Choisissez une dépense existante ou la création d'une nouvelle dépense, pas les deux",
    path: ["expenseId"],
  });
export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;

export const updatePurchaseSchema = z
  .object({
    purchaseId: uuidSchema,
    ...purchaseFields,
  })
  .refine(materialNameRequiredForOther, MATERIAL_NAME_ISSUE);
export type UpdatePurchaseInput = z.infer<typeof updatePurchaseSchema>;

export const deletePurchaseSchema = z.object({
  purchaseId: uuidSchema,
});
export type DeletePurchaseInput = z.infer<typeof deletePurchaseSchema>;
