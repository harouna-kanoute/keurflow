import Link from "next/link";
import { redirect } from "next/navigation";
import { formatMoney, getTrialDaysRemaining, hasOrgRoleAtLeast, isBillablePlan } from "@keurflow/business";
import type { OrganizationRole } from "@keurflow/types";
import { createClient } from "@/lib/supabase/server";
import { ManageBillingButton, SubscribeButton } from "./billing-actions";

const STATUS_LABELS: Record<string, string> = {
  trialing: "Essai en cours",
  active: "Actif",
  past_due: "Paiement en retard",
  canceled: "Annulé",
  incomplete: "Incomplet",
};

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
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-zinc-50 px-6 py-24 text-center dark:bg-black">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
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
    .select("plan_code, status, trial_ends_at, current_period_end, stripe_customer_id")
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

  // individual_trial is itself priced at 0 (it's the trial row) — the price
  // actually shown/charged is the "individual" plan's, fetched separately
  // so the trial view can say what it converts to.
  const { data: paidIndividualPlan } =
    isBillableTrack && plan?.price_minor === 0
      ? await supabase
          .from("plans")
          .select("price_minor, currency_code")
          .eq("code", "individual")
          .single()
      : { data: null };

  const canManageBilling = hasOrgRoleAtLeast(membership.role as OrganizationRole, "admin");
  const trialDaysRemaining = subscription
    ? getTrialDaysRemaining(subscription.trial_ends_at)
    : 0;
  const displayPrice = paidIndividualPlan ?? plan;

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-16 dark:bg-black">
      <div className="w-full max-w-md">
        <Link
          href="/dashboard"
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          ← Retour
        </Link>

        <h1 className="mt-4 text-2xl font-semibold text-black dark:text-zinc-50">Abonnement</h1>

        {checkout === "success" && (
          <p className="mt-4 rounded-xl bg-green-100 px-4 py-3 text-sm text-green-800 dark:bg-green-900/40 dark:text-green-300">
            Merci ! Votre abonnement est en cours d&apos;activation.
          </p>
        )}
        {checkout === "cancelled" && (
          <p className="mt-4 rounded-xl bg-zinc-100 px-4 py-3 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            Paiement annulé — vous pouvez réessayer à tout moment.
          </p>
        )}

        {plan && subscription ? (
          <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 text-left shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
              Plan actuel
            </p>
            <p className="mt-1 text-lg font-semibold text-black dark:text-zinc-50">{plan.label}</p>

            <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-zinc-500 dark:text-zinc-400">Statut</dt>
              <dd className="text-right text-zinc-900 dark:text-zinc-100">
                {STATUS_LABELS[subscription.status] ?? subscription.status}
              </dd>

              <dt className="text-zinc-500 dark:text-zinc-400">Prix</dt>
              <dd className="text-right text-zinc-900 dark:text-zinc-100">
                {displayPrice && displayPrice.price_minor > 0 ? (
                  <>
                    {formatMoney(displayPrice.price_minor, displayPrice.currency_code, 2)} / mois
                    {paidIndividualPlan && " (après l'essai)"}
                  </>
                ) : (
                  "—"
                )}
              </dd>

              {subscription.status === "trialing" && (
                <>
                  <dt className="text-zinc-500 dark:text-zinc-400">Essai</dt>
                  <dd className="text-right text-zinc-900 dark:text-zinc-100">
                    {trialDaysRemaining > 0
                      ? `${trialDaysRemaining} jour${trialDaysRemaining > 1 ? "s" : ""} restant${trialDaysRemaining > 1 ? "s" : ""}`
                      : "Terminé"}
                  </dd>
                </>
              )}

              {subscription.current_period_end && (
                <>
                  <dt className="text-zinc-500 dark:text-zinc-400">Renouvellement</dt>
                  <dd className="text-right text-zinc-900 dark:text-zinc-100">
                    {new Date(subscription.current_period_end).toLocaleDateString("fr-FR")}
                  </dd>
                </>
              )}
            </dl>

            {canManageBilling && isBillableTrack && (
              <div className="mt-6 flex flex-col gap-3">
                {subscription.status !== "active" && <SubscribeButton organizationId={membership.organization_id} />}
                {subscription.stripe_customer_id && (
                  <ManageBillingButton organizationId={membership.organization_id} />
                )}
              </div>
            )}

            {!canManageBilling && (
              <p className="mt-6 text-xs text-zinc-500 dark:text-zinc-400">
                Seuls les propriétaires et administrateurs peuvent gérer l&apos;abonnement.
              </p>
            )}
          </div>
        ) : (
          <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">
            Aucun abonnement trouvé pour cette organisation.
          </p>
        )}
      </div>
    </div>
  );
}
