export interface SubscriptionLike {
  status: "trialing" | "active" | "past_due" | "canceled" | "incomplete";
  trialEndsAt: string | null;
}

const BILLABLE_PLAN_CODES = new Set(["individual_trial", "individual"]);

// Only the individual plan family is billable right now — agency plans stay
// free pending a B2B pricing decision (spec §100 TODO). This is driven by
// the plan *code*, not its price: individual_trial itself is priced at 0
// minor units (it's the trial row), so gating on price directly would never
// fire during the very trial it's meant to end.
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

export function isTrialExpired(trialEndsAt: string | null, now: Date = new Date()): boolean {
  if (!trialEndsAt) return false;
  return new Date(trialEndsAt).getTime() < now.getTime();
}

// A non-billable plan (currently: any agency tier) is never blocked,
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
