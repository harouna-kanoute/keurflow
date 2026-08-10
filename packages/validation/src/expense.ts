import { z } from "zod";
import { EXPENSE_STATUSES } from "@keurflow/types";
import { amountMinorSchema, currencyCodeSchema, isoDateSchema, uuidSchema } from "./common";

export const expenseItemInputSchema = z.object({
  name: z.string().trim().min(1).max(160),
  quantity: z.number().positive().max(1_000_000),
  unit: z.string().trim().min(1).max(20),
  unitPriceMinor: amountMinorSchema,
});
export type ExpenseItemInput = z.infer<typeof expenseItemInputSchema>;

export const createExpenseSchema = z.object({
  projectId: uuidSchema,
  // amountMinor is accepted from the client as a hint only — the server always
  // recomputes it from `items` (or trusts it directly when items is empty) and
  // never persists the client-supplied total without recalculation.
  amountMinor: amountMinorSchema.optional(),
  currencyCode: currencyCodeSchema,
  category: z.string().trim().min(1).max(60),
  description: z.string().trim().max(500).optional(),
  supplierName: z.string().trim().max(160).optional(),
  expenseDate: isoDateSchema,
  milestoneId: uuidSchema.optional(),
  items: z.array(expenseItemInputSchema).max(100).optional(),
});
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;

export const updateExpenseStatusSchema = z.object({
  expenseId: uuidSchema,
  status: z.enum(EXPENSE_STATUSES),
});
export type UpdateExpenseStatusInput = z.infer<typeof updateExpenseStatusSchema>;

export const createExpenseCommentSchema = z.object({
  expenseId: uuidSchema,
  content: z.string().trim().min(1).max(2000),
});
export type CreateExpenseCommentInput = z.infer<typeof createExpenseCommentSchema>;
