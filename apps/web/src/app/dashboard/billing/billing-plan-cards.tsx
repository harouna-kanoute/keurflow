"use client";

import { useState } from "react";
import {
  convertEurMinorToCfa,
  formatMoney,
  getAnnualPriceMinor,
  getBillingCurrencyMinorUnit,
  isCfaCurrency,
} from "@keurflow/business";
import type { BillingPeriod } from "@keurflow/types";
import { ManageBillingButton, SubscribeButton } from "./billing-actions";

const STATUS_LABELS: Record<string, string> = {
  trialing: "Essai en cours",
  active: "Actif",
  past_due: "Paiement en retard",
  canceled: "Annulé",
  incomplete: "Incomplet",
};

const PERIOD_OPTIONS: { value: BillingPeriod; label: string }[] = [
  { value: "month", label: "Mensuel" },
  { value: "year", label: "Annuel" },
];

function periodButtonClass(active: boolean): string {
  return `relative flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
    active
      ? "border-brand-600 bg-brand-50 text-brand-700 dark:border-brand-500 dark:bg-brand-900 dark:text-brand-300"
      : "border-slate-300 text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600"
  }`;
}

// eurPriceMinor is always the canonical EUR monthly price from `plans`. The
// annual discount is applied in EUR first, then converted to the target
// billing currency last (if it's a CFA zone) — keeps the two conversions
// (period, currency) independent and each easy to verify on its own.
function priceForPeriod(
  eurPriceMinor: number,
  period: BillingPeriod,
  currencyCode: string,
): { amountMinor: number; suffix: string } {
  const periodAdjusted = period === "year" ? getAnnualPriceMinor(eurPriceMinor) : eurPriceMinor;
  const amountMinor = isCfaCurrency(currencyCode)
    ? convertEurMinorToCfa(periodAdjusted)
    : periodAdjusted;
  return { amountMinor, suffix: period === "year" ? "/ an" : "/ mois" };
}

export function BillingPlanCards({
  organizationId,
  canManageBilling,
  planCode,
  planLabel,
  subscriptionStatus,
  billingPeriod,
  currencyCode,
  trialDaysRemaining,
  currentPeriodEnd,
  stripeCustomerId,
  isBillableTrack,
  displayPriceMinor,
  showsAfterTrialSuffix,
  unlimitedPlanMinor,
  paidIndividualPlanMinor,
}: {
  organizationId: string;
  canManageBilling: boolean;
  planCode: string;
  planLabel: string;
  subscriptionStatus: string;
  billingPeriod: BillingPeriod;
  currencyCode: string;
  trialDaysRemaining: number;
  currentPeriodEnd: string | null;
  stripeCustomerId: string | null;
  isBillableTrack: boolean;
  displayPriceMinor: number | null;
  showsAfterTrialSuffix: boolean;
  unlimitedPlanMinor: number | null;
  paidIndividualPlanMinor: number | null;
}) {
  // Defaults to what the org already pays for once actively billed, so a
  // returning paying customer doesn't see the toggle silently reset to
  // monthly; otherwise defaults to monthly (the fixed-price option).
  const [period, setPeriod] = useState<BillingPeriod>(billingPeriod);

  const minorUnit = getBillingCurrencyMinorUnit(currencyCode);
  const price =
    displayPriceMinor !== null ? priceForPeriod(displayPriceMinor, period, currencyCode) : null;
  const monthlyReferenceForAnnual =
    period === "year" && displayPriceMinor !== null
      ? isCfaCurrency(currencyCode)
        ? convertEurMinorToCfa(displayPriceMinor * 12)
        : displayPriceMinor * 12
      : null;

  const unlimitedDelta =
    unlimitedPlanMinor !== null && paidIndividualPlanMinor !== null
      ? priceForPeriod(unlimitedPlanMinor, period, currencyCode).amountMinor -
        priceForPeriod(paidIndividualPlanMinor, period, currencyCode).amountMinor
      : null;

  return (
    <>
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-xs font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
          Plan actuel
        </p>
        <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-50">{planLabel}</p>

        {isBillableTrack && (
          <div className="mt-4 flex gap-2" role="radiogroup" aria-label="Fréquence de facturation">
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={period === option.value}
                onClick={() => setPeriod(option.value)}
                className={periodButtonClass(period === option.value)}
              >
                {option.label}
                {option.value === "year" && (
                  <span className="ml-1.5 rounded-full bg-green-100 px-1.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-400">
                    -20%
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-slate-500 dark:text-slate-400">Statut</dt>
          <dd className="text-right text-slate-900 dark:text-slate-100">
            {STATUS_LABELS[subscriptionStatus] ?? subscriptionStatus}
          </dd>

          <dt className="text-slate-500 dark:text-slate-400">Prix</dt>
          <dd className="text-right text-slate-900 dark:text-slate-100">
            {price && price.amountMinor > 0 ? (
              <>
                {formatMoney(price.amountMinor, currencyCode, minorUnit)} {price.suffix}
                {showsAfterTrialSuffix && " (après l'essai)"}
                {monthlyReferenceForAnnual !== null && (
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    au lieu de {formatMoney(monthlyReferenceForAnnual, currencyCode, minorUnit)}
                  </span>
                )}
              </>
            ) : (
              "—"
            )}
          </dd>

          {subscriptionStatus === "trialing" && (
            <>
              <dt className="text-slate-500 dark:text-slate-400">Essai</dt>
              <dd className="text-right text-slate-900 dark:text-slate-100">
                {trialDaysRemaining > 0
                  ? `${trialDaysRemaining} jour${trialDaysRemaining > 1 ? "s" : ""} restant${trialDaysRemaining > 1 ? "s" : ""}`
                  : "Terminé"}
              </dd>
            </>
          )}

          {currentPeriodEnd && (
            <>
              <dt className="text-slate-500 dark:text-slate-400">Renouvellement</dt>
              <dd className="text-right text-slate-900 dark:text-slate-100">
                {new Date(currentPeriodEnd).toLocaleDateString("fr-FR")}
              </dd>
            </>
          )}
        </dl>

        {canManageBilling && isBillableTrack && (
          <div className="mt-6 flex flex-col gap-3">
            {/* Once active, there's nothing left to subscribe to unless the
                period toggle no longer matches what's actually billed —
                same "update the live subscription in place" path the
                unlimited upsell card already uses for active customers. */}
            {(subscriptionStatus !== "active" || period !== billingPeriod) && (
              <SubscribeButton
                organizationId={organizationId}
                planCode={planCode}
                billingPeriod={period}
                label={subscriptionStatus === "active" ? "Changer de fréquence" : "S'abonner"}
              />
            )}
            {stripeCustomerId && <ManageBillingButton organizationId={organizationId} />}
          </div>
        )}

        {!canManageBilling && (
          <p className="mt-6 text-xs text-slate-500 dark:text-slate-400">
            Seuls les propriétaires et administrateurs peuvent gérer l&apos;abonnement.
          </p>
        )}
      </div>

      {canManageBilling && unlimitedPlanMinor !== null && unlimitedDelta !== null && (
        <div className="mt-4 rounded-2xl border border-brand-200 bg-brand-50 p-6 text-left dark:border-brand-900 dark:bg-brand-900/20">
          <p className="text-xs font-medium tracking-wide text-brand-700 uppercase dark:text-brand-300">
            Option
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-50">
            Chantiers illimités
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Passez à l&apos;offre illimitée pour créer autant de chantiers que nécessaire.
          </p>
          <p className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-50">
            +{formatMoney(unlimitedDelta, currencyCode, minorUnit)}
            <span className="text-base font-normal text-slate-500 dark:text-slate-400">
              {" "}
              {period === "year" ? "/ an" : "/ mois"}
            </span>
          </p>
          <div className="mt-4">
            <SubscribeButton
              organizationId={organizationId}
              planCode="individual_unlimited"
              billingPeriod={period}
              label="Passer à l'illimité"
              variant="secondary"
            />
          </div>
        </div>
      )}
    </>
  );
}
