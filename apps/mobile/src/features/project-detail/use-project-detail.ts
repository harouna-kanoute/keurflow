import {
  getBudgetConsumptionPercent,
  getFundingCoveragePercent,
  getMilestoneProgressPercent,
  getTotalFunded,
} from "@keurflow/business";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { supabase } from "../../lib/supabase";
import type { Expense, ProjectDetailState } from "./types";

// Fetches everything the project detail screen's 7 tabs need in one pass —
// mirrors web's own model (all tabs pre-rendered from data fetched once;
// switching tabs never re-fetches). Extended incrementally as each tab's PR
// lands rather than fetching data no tab uses yet (photos/members/reports
// arrive empty until their own PRs wire up the corresponding queries).
export function useProjectDetail(id: string | undefined) {
  const [state, setState] = useState<ProjectDetailState>({ status: "loading" });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;

    const { data: project } = await supabase
      .from("projects")
      .select("id, name, city, status, budget_minor, currency_code")
      .eq("id", id)
      .maybeSingle();

    if (!project) {
      setState({ status: "not-found" });
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const [{ data: fundings }, { data: expenses }, { data: milestones }, { data: paymentMethods }] =
      await Promise.all([
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
        supabase.from("milestones").select("id, name, status").eq("project_id", id),
        supabase.from("payment_methods").select("id, code, label"),
      ]);

    const fundingList = (fundings ?? []).map((f) => ({ amountMinor: f.amount_minor }));
    const expenseList = (expenses ?? []).map((e) => ({
      amountMinor: e.amount_minor,
      status: e.status as "pending" | "needs_information" | "approved" | "rejected",
    }));

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
      photos: [],
      members: [],
      reports: [],
      currentUserId: user?.id ?? null,
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
