import type { OrganizationRole } from "@keurflow/types";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { supabase } from "../../lib/supabase";

export type OrgMembership = { organizationId: string; role: OrganizationRole } | null;

// Shared by the nav drawer (gates "Journal d'activité") and the
// billing/audit-log screens (need the organization id + role directly) —
// mirrors the organization_members lookup web's dashboard/layout.tsx and
// each of those pages' own server components already do independently.
export function useOrgMembership() {
  const [membership, setMembership] = useState<OrgMembership>(null);
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
        setLoading(false);
      })();

      return () => {
        active = false;
      };
    }, []),
  );

  return { membership, loading };
}
