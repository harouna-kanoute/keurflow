import {
  deriveDocumentationStatus,
  getApprovedExpensesTotal,
  isProjectDelayed,
  sumByCurrency,
} from "@keurflow/business";
import { supabase } from "./supabase";
import type { ProjectRow } from "./projectSummary";

export type AgencyStats = {
  activeCount: number;
  clientCount: number;
  delayedCount: number;
  toReviewTotal: number;
  missingDocsTotal: number;
  budgetTotals: Record<string, number>;
  spentTotals: Record<string, number>;
};

// Mirrors apps/web dashboard/agency-dashboard.tsx's aggregation exactly —
// same per-project queries (expenses, documents, project_members), same
// business-logic helpers from @keurflow/business — so the two dashboards
// can never silently drift apart on what counts as "à vérifier" or
// "documents manquants".
export async function loadAgencyStats(
  organizationId: string,
  projects: readonly (ProjectRow & { expected_end_date: string | null })[],
): Promise<AgencyStats> {
  const { data: orgMembers } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", organizationId)
    .eq("status", "active");
  const orgStaffIds = new Set((orgMembers ?? []).map((m) => m.user_id as string));

  const clientIds = new Set<string>();

  const perProject = await Promise.all(
    projects.map(async (project) => {
      const [{ data: expenses }, { data: documents }, { data: members }] = await Promise.all([
        supabase.from("expenses").select("id, amount_minor, status").eq("project_id", project.id),
        supabase
          .from("documents")
          .select("expense_id")
          .eq("project_id", project.id)
          .not("expense_id", "is", null),
        supabase
          .from("project_members")
          .select("user_id")
          .eq("project_id", project.id)
          .eq("status", "active"),
      ]);

      for (const member of members ?? []) {
        if (!orgStaffIds.has(member.user_id)) clientIds.add(member.user_id);
      }

      const docCountByExpense = new Map<string, number>();
      for (const doc of documents ?? []) {
        if (!doc.expense_id) continue;
        docCountByExpense.set(doc.expense_id, (docCountByExpense.get(doc.expense_id) ?? 0) + 1);
      }

      const expenseList = (expenses ?? []).map((e) => ({
        amountMinor: e.amount_minor,
        status: e.status as "pending" | "needs_information" | "approved" | "rejected",
      }));
      const toReviewCount = expenseList.filter(
        (e) => e.status === "pending" || e.status === "needs_information",
      ).length;
      const missingDocsCount = (expenses ?? []).filter(
        (e) => deriveDocumentationStatus(docCountByExpense.get(e.id) ?? 0) === "missing",
      ).length;

      return {
        budgetMinor: project.budget_minor,
        currencyCode: project.currency_code,
        spentMinor: getApprovedExpensesTotal(expenseList),
        toReviewCount,
        missingDocsCount,
        delayed: isProjectDelayed(
          project.expected_end_date,
          project.status as "planning" | "active" | "paused" | "completed" | "archived",
        ),
      };
    }),
  );

  return {
    activeCount: projects.filter((p) => p.status === "active").length,
    clientCount: clientIds.size,
    delayedCount: perProject.filter((r) => r.delayed).length,
    toReviewTotal: perProject.reduce((sum, r) => sum + r.toReviewCount, 0),
    missingDocsTotal: perProject.reduce((sum, r) => sum + r.missingDocsCount, 0),
    budgetTotals: sumByCurrency(perProject.map((r) => ({ amountMinor: r.budgetMinor, currencyCode: r.currencyCode }))),
    spentTotals: sumByCurrency(perProject.map((r) => ({ amountMinor: r.spentMinor, currencyCode: r.currencyCode }))),
  };
}
