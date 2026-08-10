import type { PaymentMethod } from "@keurflow/types";

// Extensible on purpose: new African payment rails (e.g. Free Money, Wizall)
// are added as rows in the `payment_methods` table, not as new code paths.
export const PAYMENT_METHODS: readonly Omit<PaymentMethod, "id">[] = [
  { code: "bank_transfer", label: "Virement bancaire", active: true },
  { code: "wave", label: "Wave", active: true },
  { code: "orange_money", label: "Orange Money", active: true },
  { code: "mobile_money", label: "Mobile Money", active: true },
  { code: "cash", label: "Espèces", active: true },
  { code: "other", label: "Autre", active: true },
] as const;
