export interface SubscriptionLike {
  status: "trialing" | "active" | "past_due" | "canceled" | "incomplete";
  trialEndsAt: string | null;
}

const BILLABLE_PLAN_CODES = new Set([
  "individual_trial",
  "individual",
  "individual_unlimited",
  "agency_starter",
  "agency_business",
]);

// The individual family and the two self-serve agency tiers are billable.
// agency_enterprise stays excluded — it's sold "sur devis" (negotiated per
// customer), never self-serve, priced at 0. This is driven by the plan
// *code*, not its price: individual_trial itself is priced at 0 minor units
// (it's the trial row), so gating on price directly would never fire during
// the very trial it's meant to end.
export function isBillablePlan(planCode: string): boolean {
  return BILLABLE_PLAN_CODES.has(planCode);
}

// Days left in the trial, clamped to 0 — never negative, and 0 for plans
// without a trial (trialEndsAt null). Mirrors the display side of the
// enforcement that actually happens server-side in create_project()
// (supabase/migrations/20260811330000_project_limits_fix.sql).
export function getTrialDaysRemaining(trialEndsAt: string | null, now: Date = new Date()): number {
  if (!trialEndsAt) return 0;
  const msRemaining = new Date(trialEndsAt).getTime() - now.getTime();
  return Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
}

// 20% off the monthly price, billed as one annual payment — e.g. 14,99€/mo
// -> 143,90€/yr instead of 179,88€/yr. Derived from plans.price_minor rather
// than stored as its own column: one number to keep in sync, not two (same
// reasoning as Stripe checkout building price_data dynamically instead of
// pre-created Price objects — see createCheckoutSession).
export const ANNUAL_DISCOUNT_RATE = 0.2;

export function getAnnualPriceMinor(monthlyPriceMinor: number): number {
  return Math.round(monthlyPriceMinor * 12 * (1 - ANNUAL_DISCOUNT_RATE));
}

export function isTrialExpired(trialEndsAt: string | null, now: Date = new Date()): boolean {
  if (!trialEndsAt) return false;
  return new Date(trialEndsAt).getTime() < now.getTime();
}

// A non-billable plan (currently: only agency_enterprise) is never blocked,
// whatever the subscription status. For a billable plan, blocked once the
// trial has lapsed with no paid subscription behind it, or once billing has
// actually failed/lapsed.
export function isSubscriptionBlocked(
  subscription: SubscriptionLike,
  planCode: string,
  now: Date = new Date(),
): boolean {
  if (!isBillablePlan(planCode)) return false;
  if (subscription.status === "trialing") return isTrialExpired(subscription.trialEndsAt, now);
  return (
    subscription.status === "past_due" ||
    subscription.status === "canceled" ||
    subscription.status === "incomplete"
  );
}
