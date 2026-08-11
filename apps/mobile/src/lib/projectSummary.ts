import {
  getApprovedExpensesTotal,
  getMilestoneProgressPercent,
  getTotalFunded,
} from "@keurflow/business";
import { CURRENCIES } from "@keurflow/config";
import { supabase } from "./supabase";

export function minorUnitFor(currencyCode: string): number {
  return CURRENCIES.find((c) => c.code === currencyCode)?.minorUnit ?? 2;
}

export type ProjectRow = {
  id: string;
  name: string;
  status: string;
  budget_minor: number;
  currency_code: string;
};

export type ProjectSummary = ProjectRow & {
  progressPercent: number;
  funded: number;
  spent: number;
  toReviewCount: number;
};

// Mirrors apps/web dashboard/page.tsx's per-project aggregation — same
// RLS-scoped per-table queries, fine at B2C scale (a handful of projects).
export async function loadProjectSummary(project: ProjectRow): Promise<ProjectSummary> {
  const [{ data: fundings }, { data: expenses }, { data: milestones }] = await Promise.all([
    supabase.from("fundings").select("amount_minor").eq("project_id", project.id),
    supabase.from("expenses").select("amount_minor, status").eq("project_id", project.id),
    supabase.from("milestones").select("status").eq("project_id", project.id),
  ]);

  const expenseList = (expenses ?? []).map((e) => ({
    amountMinor: e.amount_minor,
    status: e.status as "pending" | "needs_information" | "approved" | "rejected",
  }));

  return {
    ...project,
    progressPercent: getMilestoneProgressPercent(
      (milestones ?? []).map((m) => ({
        status: m.status as "pending" | "in_progress" | "completed" | "delayed",
      })),
    ),
    funded: getTotalFunded((fundings ?? []).map((f) => ({ amountMinor: f.amount_minor }))),
    spent: getApprovedExpensesTotal(expenseList),
    toReviewCount: expenseList.filter(
      (e) => e.status === "pending" || e.status === "needs_information",
    ).length,
  };
}
