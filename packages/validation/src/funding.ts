import { z } from "zod";
import {
  amountMinorSchema,
  currencyCodeSchema,
  isoDateSchema,
  paymentMethodCodeSchema,
  uuidSchema,
} from "./common";

export const createFundingSchema = z.object({
  projectId: uuidSchema,
  amountMinor: amountMinorSchema,
  currencyCode: currencyCodeSchema,
  paymentMethodCode: paymentMethodCodeSchema,
  reference: z.string().trim().max(120, "120 caractères maximum").optional(),
  description: z.string().trim().max(500, "500 caractères maximum").optional(),
  fundingDate: isoDateSchema,
});
export type CreateFundingInput = z.infer<typeof createFundingSchema>;
