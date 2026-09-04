import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTrialDaysRemaining, hasOrgRoleAtLeast, isBillablePlan } from "@keurflow/business";
import type { BillingPeriod, OrganizationRole } from "@keurflow/types";
import { createClient } from "@/lib/supabase/server";
import { BillingPlanCards } from "./billing-plan-cards";
import { getOrgBillingCurrency } from "./currency";

export const metadata: Metadata = { title: "Abonnement — KeurFlow" };

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { checkout } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS (organization_members_select_same_org) already scopes this to
  // organizations this user actually belongs to.
  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-canvas px-6 py-24 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Aucune organisation associée à votre compte pour l&apos;instant.
        </p>
        <Link href="/dashboard" className="text-sm underline">
          Retour
        </Link>
      </div>
    );
  }

  // RLS (subscriptions_select_members / plans_select_all) scopes these the
  // same way — a subscription row always exists once an organization does,
  // created atomically by create_organization() (§15, Phase 15).
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select(
      "plan_code, status, billing_period, currency_code, trial_ends_at, current_period_end, stripe_customer_id, stripe_subscription_id",
    )
    .eq("organization_id", membership.organization_id)
    .single();

  const { data: plan } = subscription
    ? await supabase
        .from("plans")
        .select("code, label, price_minor, trial_days")
        .eq("code", subscription.plan_code)
        .single()
    : { data: null };

  const isBillableTrack = !!subscription && isBillablePlan(subscription.plan_code);
  const isUnlimited = subscription?.plan_code === "individual_unlimited";
  // Only the individual family gets the "unlimited chantiers" add-on
  // upsell — agencies have separate Starter/Business/Enterprise tiers
  // instead, which is a plan upgrade, not an add-on.
  const isIndividualFamily =
    subscription?.plan_code === "individual_trial" ||
    subscription?.plan_code === "individual" ||
    subscription?.plan_code === "individual_unlimited";

  // Currency is immutable on a live Stripe subscription — once one exists,
  // subscriptions.currency_code (kept in sync by the webhook) is
  // authoritative. Before that (still trialing, never checked out), preview
  // what a *new* subscription would be created in, derived from the org's
  // current type/country (see getOrgBillingCurrency) — same computation
  // createCheckoutSession itself uses.
  const currencyCode = subscription?.stripe_subscription_id
    ? subscription.currency_code
    : await getOrgBillingCurrency(supabase, membership.organization_id);

  // individual_trial is itself priced at 0 (it's the trial row) — the price
  // actually shown/charged is the "individual" plan's, fetched separately
  // so the trial view can say what it converts to. Also doubles as the
  // baseline for the unlimited add-on's "+X€" delta below.
  const { data: paidIndividualPlan } =
    isBillableTrack && isIndividualFamily
      ? await supabase.from("plans").select("price_minor").eq("code", "individual").single()
      : { data: null };

  const { data: unlimitedPlan } =
    isBillableTrack && isIndividualFamily && !isUnlimited
      ? await supabase.from("plans").select("price_minor").eq("code", "individual_unlimited").single()
      : { data: null };

  // subscription.plan_code is the *current* plan, which can be a trial-only
  // code (individual_trial) that Stripe checkout can never target directly —
  // CHECKOUT_PLAN_CODES in actions.ts deliberately excludes it. Resolve to
  // the real paid plan the trial converts to before handing it to
  // BillingPlanCards, which passes it straight through to the checkout button.
  const checkoutPlanCode =
    subscription?.plan_code === "individual_trial" ? "individual" : subscription?.plan_code;

  const canManageBilling = hasOrgRoleAtLeast(membership.role as OrganizationRole, "admin");
  const trialDaysRemaining = subscription
    ? getTrialDaysRemaining(subscription.trial_ends_at)
    : 0;
  const displayPrice = (plan?.price_minor === 0 ? paidIndividualPlan : null) ?? plan;

  return (
    <div className="flex flex-1 flex-col items-center bg-canvas px-6 py-16">
      <div className="w-full max-w-md">
        <Link
          href="/dashboard"
          className="text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        >
          ← Retour
        </Link>

        <h1 className="mt-4 text-2xl font-semibold text-slate-900 dark:text-slate-50">Abonnement</h1>

        {checkout === "success" && (
          <p className="mt-4 rounded-xl bg-green-100 px-4 py-3 text-sm text-green-800 dark:bg-green-900/40 dark:text-green-300">
            Merci ! Votre abonnement est en cours d&apos;activation.
          </p>
        )}
        {checkout === "cancelled" && (
          <p className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Paiement annulé — vous pouvez réessayer à tout moment.
          </p>
        )}

        {plan && subscription ? (
          <BillingPlanCards
            organizationId={membership.organization_id}
            canManageBilling={canManageBilling}
            planCode={checkoutPlanCode ?? subscription.plan_code}
            planLabel={plan.label}
            subscriptionStatus={subscription.status}
            billingPeriod={subscription.billing_period as BillingPeriod}
            currencyCode={currencyCode}
            trialDaysRemaining={trialDaysRemaining}
            currentPeriodEnd={subscription.current_period_end}
            stripeCustomerId={subscription.stripe_customer_id}
            isBillableTrack={isBillableTrack}
            displayPriceMinor={displayPrice?.price_minor ?? null}
            showsAfterTrialSuffix={plan?.price_minor === 0 && !!paidIndividualPlan}
            unlimitedPlanMinor={unlimitedPlan?.price_minor ?? null}
            paidIndividualPlanMinor={paidIndividualPlan?.price_minor ?? null}
          />
        ) : (
          <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
            Aucun abonnement trouvé pour cette organisation.
          </p>
        )}
      </div>
    </div>
  );
}
