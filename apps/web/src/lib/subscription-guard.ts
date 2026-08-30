import "server-only";
import { isSubscriptionBlocked } from "@keurflow/business";
import type { SubscriptionStatus } from "@keurflow/types";
import type { SupabaseClient } from "@supabase/supabase-js";

// Mirrors the SQL-level check already in create_project() (see
// supabase/migrations/20260822030000_create_project_paywall_all_billable_plans.sql)
// but for every other mutating Server Action, none of which gated on
// subscription status before this — see isOrganizationBlocked's call sites
// in dashboard/projects/[id]/actions.ts and dashboard/actions.ts.
//
// Uses the caller's own RLS-scoped client (subscriptions_select_members
// already allows this read) — no admin client needed, same reasoning as
// every other read-only check in these action files.
export async function isOrganizationBlocked(
  supabase: SupabaseClient,
  params: { organizationId?: string | null; projectId?: string | null },
): Promise<boolean> {
  let organizationId = params.organizationId ?? null;
  if (!organizationId && params.projectId) {
    const { data: project } = await supabase
      .from("projects")
      .select("organization_id")
      .eq("id", params.projectId)
      .maybeSingle();
    organizationId = project?.organization_id ?? null;
  }
  if (!organizationId) return false;

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status, trial_ends_at, plan_code")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!subscription) return false;

  return isSubscriptionBlocked(
    { status: subscription.status as SubscriptionStatus, trialEndsAt: subscription.trial_ends_at },
    subscription.plan_code,
  );
}
