import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getBillingCurrency } from "@keurflow/business";

// Deliberately not a Server Action (no "use server") — every export in a
// "use server" file becomes a client-callable endpoint, which would force
// this to accept only serializable arguments. It's only ever called from
// other server code (actions.ts, the billing page), so a plain shared
// server-only helper is both simpler and correctly scoped.
//
// The currency a *new* subscription would be created in — derived from the
// organization's own country (agencies/companies based in a CFA-zone
// country bill locally in XOF/XAF; everyone else, including individual
// accounts, stays EUR — see getBillingCurrency). Never used to change the
// currency of an *existing* subscription: Stripe's currency is immutable
// once a subscription exists, so that path always reuses
// subscriptions.currency_code instead (see createCheckoutSession).
export async function getOrgBillingCurrency(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<string> {
  const { data: org } = await supabase
    .from("organizations")
    .select("type, country_id")
    .eq("id", organizationId)
    .single();
  if (!org) return "EUR";
  if (!org.country_id) return getBillingCurrency(org.type, null);

  const { data: country } = await supabase
    .from("countries")
    .select("currency_code")
    .eq("id", org.country_id)
    .single();
  return getBillingCurrency(org.type, country?.currency_code ?? null);
}
