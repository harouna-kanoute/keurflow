"use server";

import { revalidatePath } from "next/cache";
import { createFundingSchema, type CreateFundingInput } from "@keurflow/validation";
import { createClient } from "@/lib/supabase/server";

// Generic fallback per §68 — real Supabase error details never reach the client.
const GENERIC_ERROR = "Une erreur est survenue. Veuillez réessayer.";

export type ActionResult = { error: string } | { error?: undefined };

export async function createFunding(input: CreateFundingInput): Promise<ActionResult> {
  const parsed = createFundingSchema.safeParse(input);
  if (!parsed.success) return { error: GENERIC_ERROR };

  const supabase = await createClient();

  const { data: paymentMethod } = await supabase
    .from("payment_methods")
    .select("id")
    .eq("code", parsed.data.paymentMethodCode)
    .single();

  if (!paymentMethod) return { error: GENERIC_ERROR };

  // created_by defaults to auth.uid() in the DB; RLS (fundings_insert_non_viewers)
  // is the authoritative check on whether this user may log a funding here.
  const { error } = await supabase.from("fundings").insert({
    project_id: parsed.data.projectId,
    amount_minor: parsed.data.amountMinor,
    currency_code: parsed.data.currencyCode,
    payment_method_id: paymentMethod.id,
    reference: parsed.data.reference ?? null,
    description: parsed.data.description ?? null,
    funding_date: parsed.data.fundingDate,
  });

  if (error) {
    console.error("[createFunding] Supabase error:", error.code, error.message);
    return { error: GENERIC_ERROR };
  }

  revalidatePath(`/dashboard/projects/${parsed.data.projectId}`);
  return {};
}
