import {
  getBudgetConsumptionPercent,
  getFundingCoveragePercent,
  getMilestoneProgressPercent,
  getTotalFunded,
  hasOrgRoleAtLeast,
  hasProjectRoleAtLeast,
} from "@keurflow/business";
import type { OrganizationRole, ProjectRole } from "@keurflow/types";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { supabase } from "../../lib/supabase";
import type { Expense, Photo, ProjectDetailState } from "./types";

const PHOTO_LIMIT = 30;

// Fetches everything the project detail screen's 7 tabs need in one pass —
// mirrors web's own model (all tabs pre-rendered from data fetched once;
// switching tabs never re-fetches). Extended incrementally as each tab's PR
// lands rather than fetching data no tab uses yet (members/reports arrive
// empty until PR 3 wires up the corresponding queries).
export function useProjectDetail(id: string | undefined) {
  const [state, setState] = useState<ProjectDetailState>({ status: "loading" });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;

    const { data: project } = await supabase
      .from("projects")
      .select("id, name, city, status, budget_minor, currency_code, organization_id")
      .eq("id", id)
      .maybeSingle();

    if (!project) {
      setState({ status: "not-found" });
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const [
      { data: fundings },
      { data: expenses },
      { data: milestones },
      { data: paymentMethods },
      { data: photoRows },
      orgRoleResult,
      projectRoleResult,
    ] = await Promise.all([
      supabase
        .from("fundings")
        .select("id, amount_minor, currency_code, reference, funding_date, payment_method_id")
        .eq("project_id", id)
        .order("funding_date", { ascending: false }),
      supabase
        .from("expenses")
        .select("id, amount_minor, currency_code, category, supplier_name, expense_date, status")
        .eq("project_id", id)
        .order("expense_date", { ascending: false })
        .limit(10),
      supabase
        .from("milestones")
        .select("id, name, status, order_index")
        .eq("project_id", id)
        .order("order_index", { ascending: true }),
      supabase.from("payment_methods").select("id, code, label"),
      supabase
        .from("photos")
        .select("id, storage_path, caption, uploaded_by, created_at")
        .eq("project_id", id)
        .order("created_at", { ascending: false })
        .limit(PHOTO_LIMIT),
      user
        ? supabase
            .from("organization_members")
            .select("role")
            .eq("organization_id", project.organization_id)
            .eq("user_id", user.id)
            .eq("status", "active")
            .maybeSingle()
        : Promise.resolve({ data: null }),
      user
        ? supabase
            .from("project_members")
            .select("role")
            .eq("project_id", id)
            .eq("user_id", user.id)
            .eq("status", "active")
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const fundingList = (fundings ?? []).map((f) => ({ amountMinor: f.amount_minor }));
    const expenseList = (expenses ?? []).map((e) => ({
      amountMinor: e.amount_minor,
      status: e.status as "pending" | "needs_information" | "approved" | "rejected",
    }));

    let photos: Photo[] = (photoRows ?? []).map((p) => ({ ...p, signedUrl: null }));
    if (photos.length > 0) {
      const { data: signed } = await supabase.storage
        .from("project-photos")
        .createSignedUrls(
          photos.map((p) => p.storage_path),
          3600,
        );
      photos = photos.map((p, i) => ({ ...p, signedUrl: signed?.[i]?.signedUrl ?? null }));
    }

    const orgRole = (orgRoleResult.data?.role as OrganizationRole | undefined) ?? "viewer";
    const projectRole = (projectRoleResult.data?.role as ProjectRole | undefined) ?? "project_viewer";
    const canManageAny =
      hasOrgRoleAtLeast(orgRole, "manager") || hasProjectRoleAtLeast(projectRole, "project_manager");

    setState({
      status: "ready",
      project,
      totalFunded: getTotalFunded(fundingList),
      coveragePercent: getFundingCoveragePercent(project.budget_minor, fundingList),
      consumptionPercent: getBudgetConsumptionPercent(project.budget_minor, expenseList),
      milestoneProgress: getMilestoneProgressPercent(
        (milestones ?? []).map((m) => ({ status: m.status as never })),
      ),
      milestones: milestones ?? [],
      expenses: (expenses ?? []) as Expense[],
      fundings: fundings ?? [],
      paymentMethods: paymentMethods ?? [],
      photos,
      members: [],
      reports: [],
      currentUserId: user?.id ?? null,
      canManageAny,
    });
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return { state, refreshing, onRefresh, reload: load };
}
