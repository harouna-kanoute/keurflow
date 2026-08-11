"use server";

import { redirect } from "next/navigation";
import { hasOrgRoleAtLeast, isBillablePlan } from "@keurflow/business";
import type { OrganizationRole } from "@keurflow/types";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

// Generic fallback per §68 — real Stripe/Supabase error details never reach the client.
const GENERIC_ERROR = "Une erreur est survenue. Veuillez réessayer.";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export type ActionResult = { error: string } | { error?: undefined };

// Billing is org-admin-only — re-checked here server-side (§69/§83), never
// trusted from the client, same pattern as inviteProjectMember.
async function requireOrgAdmin(organizationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!membership || !hasOrgRoleAtLeast(membership.role as OrganizationRole, "admin")) {
    return null;
  }
  return { supabase, user };
}

export async function createCheckoutSession(organizationId: string): Promise<ActionResult> {
  const auth = await requireOrgAdmin(organizationId);
  if (!auth) return { error: GENERIC_ERROR };
  const { supabase, user } = auth;

  const productId = process.env.STRIPE_PRODUCT_ID_INDIVIDUAL;
  if (!productId) return { error: GENERIC_ERROR };

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan_code, stripe_customer_id")
    .eq("organization_id", organizationId)
    .single();
  // isBillablePlan, not a plain "does a row exist" check: individual_trial
  // is itself priced at 0 (it's the trial row) — checkout always targets
  // the "individual" plan specifically, the only paid plan right now.
  if (!subscription || !isBillablePlan(subscription.plan_code)) return { error: GENERIC_ERROR };

  const { data: plan } = await supabase
    .from("plans")
    .select("price_minor, currency_code")
    .eq("code", "individual")
    .single();
  if (!plan || plan.price_minor <= 0) return { error: GENERIC_ERROR };

  const stripe = getStripe();
  // subscriptions has no UPDATE policy for `authenticated` (writes are
  // server-only, mirrored by the webhook) — even this trusted, pre-authorized
  // path uses the admin client to persist the new Stripe customer id.
  const admin = createAdminClient();

  let customerId = subscription.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { organization_id: organizationId },
    });
    customerId = customer.id;
    await admin
      .from("subscriptions")
      .update({ stripe_customer_id: customerId })
      .eq("organization_id", organizationId);
  }

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [
        {
          price_data: {
            product: productId,
            currency: plan.currency_code.toLowerCase(),
            unit_amount: plan.price_minor,
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      success_url: `${APP_URL}/dashboard/billing?checkout=success`,
      cancel_url: `${APP_URL}/dashboard/billing?checkout=cancelled`,
      metadata: { organization_id: organizationId },
      subscription_data: { metadata: { organization_id: organizationId } },
    });
  } catch (error) {
    console.error("[createCheckoutSession] Stripe error:", error);
    return { error: GENERIC_ERROR };
  }

  if (!session.url) return { error: GENERIC_ERROR };
  redirect(session.url);
}

export async function createBillingPortalSession(organizationId: string): Promise<ActionResult> {
  const auth = await requireOrgAdmin(organizationId);
  if (!auth) return { error: GENERIC_ERROR };
  const { supabase } = auth;

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("organization_id", organizationId)
    .single();

  if (!subscription?.stripe_customer_id) {
    return { error: "Aucun abonnement à gérer pour le moment." };
  }

  const stripe = getStripe();
  let session;
  try {
    session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${APP_URL}/dashboard/billing`,
    });
  } catch (error) {
    console.error("[createBillingPortalSession] Stripe error:", error);
    return { error: GENERIC_ERROR };
  }

  redirect(session.url);
}
