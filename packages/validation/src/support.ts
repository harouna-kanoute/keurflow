import { z } from "zod";
import { SUPPORT_TICKET_CATEGORIES } from "@keurflow/types";
import { uuidSchema } from "./common";

export const createSupportTicketSchema = z.object({
  organizationId: uuidSchema.optional(),
  category: z.enum(SUPPORT_TICKET_CATEGORIES),
  subject: z.string().trim().min(3, "3 caractères minimum").max(150, "150 caractères maximum"),
  description: z
    .string()
    .trim()
    .min(10, "Décrivez le problème en au moins 10 caractères")
    .max(4000, "4000 caractères maximum"),
  // Auto-captured from the page the user was on — helps reproduce the issue,
  // not something they type in themselves.
  pageUrl: z.string().trim().max(300).optional(),
});
export type CreateSupportTicketInput = z.infer<typeof createSupportTicketSchema>;
