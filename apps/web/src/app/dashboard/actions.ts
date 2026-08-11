"use server";

import { revalidatePath } from "next/cache";
import { createOrganizationSchema, type CreateOrganizationInput } from "@keurflow/validation";
import { createClient } from "@/lib/supabase/server";

// Generic fallback per §68 — real Supabase error details never reach the client.
const GENERIC_ERROR = "Une erreur est survenue. Veuillez réessayer.";

export type ActionResult = { error: string } | { error?: undefined };

export async function createOrganization(input: CreateOrganizationInput): Promise<ActionResult> {
  const parsed = createOrganizationSchema.safeParse(input);
  if (!parsed.success) return { error: GENERIC_ERROR };

  const supabase = await createClient();

  const { data: country } = await supabase
    .from("countries")
    .select("id")
    .eq("code", parsed.data.countryCode)
    .single();

  if (!country) return { error: GENERIC_ERROR };

  // create_organization() is SECURITY DEFINER: it inserts the organization
  // row and the caller's owner membership row atomically (see migration
  // 20260811140000_organizations.sql) — a plain client-side insert can't do
  // this because no membership row exists yet to authorize it via RLS.
  const { error } = await supabase.rpc("create_organization", {
    org_name: parsed.data.name,
    org_type: parsed.data.type,
    org_country_id: country.id,
  });

  if (error) {
    console.error("[createOrganization] Supabase error:", error.code, error.message);
    return { error: GENERIC_ERROR };
  }

  revalidatePath("/dashboard");
  return {};
}
