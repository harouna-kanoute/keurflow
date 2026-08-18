import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTrialDaysRemaining, hasOrgRoleAtLeast, isBillablePlan } from "@keurflow/business";
import type { BillingPeriod, OrganizationRole } from "@keurflow/types";
import { createClient } from "@/lib/supabase/server";
import { BillingPlanCards } from "./billing-plan-cards";

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
    .select("plan_code, status, billing_period, trial_ends_at, current_period_end, stripe_customer_id")
    .eq("organization_id", membership.organization_id)
    .single();

  const { data: plan } = subscription
    ? await supabase
        .from("plans")
        .select("code, label, price_minor, currency_code, trial_days")
        .eq("code", subscription.plan_code)
        .single()
    : { data: null };

  const isBillableTrack = !!subscription && isBillablePlan(subscription.plan_code);
  const isUnlimited = subscription?.plan_code === "individual_unlimited";

  // individual_trial is itself priced at 0 (it's the trial row) — the price
  // actually shown/charged is the "individual" plan's, fetched separately
  // so the trial view can say what it converts to. Also doubles as the
  // baseline for the unlimited add-on's "+X€" delta below.
  const { data: paidIndividualPlan } = isBillableTrack
    ? await supabase.from("plans").select("price_minor, currency_code").eq("code", "individual").single()
    : { data: null };

  const { data: unlimitedPlan } =
    isBillableTrack && !isUnlimited
      ? await supabase
          .from("plans")
          .select("price_minor, currency_code")
          .eq("code", "individual_unlimited")
          .single()
      : { data: null };

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
            planLabel={plan.label}
            subscriptionStatus={subscription.status}
            billingPeriod={subscription.billing_period as BillingPeriod}
            trialDaysRemaining={trialDaysRemaining}
            currentPeriodEnd={subscription.current_period_end}
            stripeCustomerId={subscription.stripe_customer_id}
            isBillableTrack={isBillableTrack}
            isUnlimited={isUnlimited}
            displayPrice={
              displayPrice
                ? { priceMinor: displayPrice.price_minor, currencyCode: displayPrice.currency_code }
                : null
            }
            showsAfterTrialSuffix={plan?.price_minor === 0 && !!paidIndividualPlan}
            unlimitedPlan={
              unlimitedPlan
                ? { priceMinor: unlimitedPlan.price_minor, currencyCode: unlimitedPlan.currency_code }
                : null
            }
            paidIndividualPlan={
              paidIndividualPlan
                ? {
                    priceMinor: paidIndividualPlan.price_minor,
                    currencyCode: paidIndividualPlan.currency_code,
                  }
                : null
            }
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
