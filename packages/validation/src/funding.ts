import { z } from "zod";
import { amountMinorSchema, currencyCodeSchema, isoDateSchema, uuidSchema } from "./common";

export const createFundingSchema = z.object({
  projectId: uuidSchema,
  amountMinor: amountMinorSchema,
  currencyCode: currencyCodeSchema,
  paymentMethodId: uuidSchema,
  reference: z.string().trim().max(120).optional(),
  description: z.string().trim().max(500).optional(),
  fundingDate: isoDateSchema,
});
export type CreateFundingInput = z.infer<typeof createFundingSchema>;
