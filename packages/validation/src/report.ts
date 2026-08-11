import { z } from "zod";
import { isoDateSchema, uuidSchema } from "./common";

export const createReportSchema = z
  .object({
    projectId: uuidSchema,
    periodStart: isoDateSchema,
    periodEnd: isoDateSchema,
  })
  .refine((data) => new Date(data.periodEnd) >= new Date(data.periodStart), {
    message: "La fin de période doit être après le début",
    path: ["periodEnd"],
  });
export type CreateReportInput = z.infer<typeof createReportSchema>;
