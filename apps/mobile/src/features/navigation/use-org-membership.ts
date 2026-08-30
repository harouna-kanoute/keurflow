import { isSubscriptionBlocked } from "@keurflow/business";
import type { OrganizationRole, SubscriptionStatus } from "@keurflow/types";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { supabase } from "../../lib/supabase";

export type OrgMembership = { organizationId: string; role: OrganizationRole } | null;

// Shared by the nav drawer (gates "Journal d'activité") and the
// billing/audit-log screens (need the organization id + role directly) —
// mirrors the organization_members lookup web's dashboard/layout.tsx and
// each of those pages' own server components already do independently.
//
// Also computes isBlocked (trial expired / subscription not active) with
// the same isSubscriptionBlocked helper web's Server Actions now guard with
// — mobile has no server layer to enforce this at (writes go straight to
// Supabase with RLS as the only real authority, unchanged by this), so this
// is a client-side-only gate: same UI behavior as web, no new security
// boundary.
export function useOrgMembership() {
  const [membership, setMembership] = useState<OrgMembership>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from("organization_members")
          .select("organization_id, role")
          .eq("user_id", user.id)
          .eq("status", "active")
          .limit(1)
          .maybeSingle();

        if (!active) return;
        setMembership(
          data ? { organizationId: data.organization_id, role: data.role as OrganizationRole } : null,
        );

        if (data) {
          const { data: subscription } = await supabase
            .from("subscriptions")
            .select("status, trial_ends_at, plan_code")
            .eq("organization_id", data.organization_id)
            .maybeSingle();
          if (!active) return;
          setIsBlocked(
            subscription
              ? isSubscriptionBlocked(
                  { status: subscription.status as SubscriptionStatus, trialEndsAt: subscription.trial_ends_at },
                  subscription.plan_code,
                )
              : false,
          );
        } else {
          setIsBlocked(false);
        }
        setLoading(false);
      })();

      return () => {
        active = false;
      };
    }, []),
  );

  return { membership, isBlocked, loading };
}
