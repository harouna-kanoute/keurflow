import {
  deriveDocumentationStatus,
  formatMoney,
  getApprovedExpensesTotal,
  isProjectDelayed,
  sumByCurrency,
} from "@keurflow/business";
import { CURRENCIES } from "@keurflow/config";
import { createClient } from "@/lib/supabase/server";
import { AlertIcon, BudgetIcon, ClockIcon, FlagIcon, ReceiptIcon, UsersIcon } from "@/components/icons";
import { AgencyProjectsTable, type AgencyProjectRow } from "./agency-projects-table";

function minorUnitFor(currencyCode: string): number {
  return CURRENCIES.find((c) => c.code === currencyCode)?.minorUnit ?? 2;
}

function MultiCurrencyAmount({ totals }: { totals: Record<string, number> }) {
  const entries = Object.entries(totals);
  if (entries.length === 0) {
    return <span>{formatMoney(0, "EUR", 2)}</span>;
  }
  return (
    <span>
      {entries
        .map(([currencyCode, amountMinor]) =>
          formatMoney(amountMinor, currencyCode, minorUnitFor(currencyCode)),
        )
        .join(" + ")}
    </span>
  );
}

const TONE_CLASSES = {
  brand: "bg-brand-50 text-brand-600 dark:bg-brand-900 dark:text-brand-300",
  warning: "bg-amber-50 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400",
  danger: "bg-red-50 text-red-600 dark:bg-red-900/40 dark:text-red-400",
} as const;

function StatCard({
  label,
  value,
  icon: Icon,
  tone = "brand",
}: {
  label: string;
  value: React.ReactNode;
  icon: (props: { className?: string }) => React.ReactNode;
  tone?: keyof typeof TONE_CLASSES;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${TONE_CLASSES[tone]}`}>
        <Icon className="h-4.5 w-4.5" />
      </span>
      <p className="mt-3 text-xs font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-50">{value}</p>
    </div>
  );
}

export async function AgencyDashboard({
  organizationId,
  canEditProjects,
  canDeleteProjects,
}: {
  organizationId: string;
  canEditProjects: boolean;
  canDeleteProjects: boolean;
}) {
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("projects")
    .select(
      "id, name, project_type, status, budget_minor, currency_code, country_id, expected_end_date, address, surface_area",
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  const { data: countries } = await supabase.from("countries").select("id, name");
  const countryNames = new Map((countries ?? []).map((c) => [c.id, c.name]));

  const { data: orgMembers } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", organizationId)
    .eq("status", "active");
  const orgStaffIds = new Set((orgMembers ?? []).map((m) => m.user_id));

  const clientIds = new Set<string>();

  const rowsWithMissingDocs = await Promise.all(
    (projects ?? []).map(async (project) => {
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
        id: project.id,
        name: project.name,
        projectType: project.project_type,
        status: project.status,
        countryName: countryNames.get(project.country_id) ?? "—",
        budgetMinor: project.budget_minor,
        currencyCode: project.currency_code,
        address: project.address,
        surfaceArea: project.surface_area,
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

  const rows: AgencyProjectRow[] = rowsWithMissingDocs;
  const activeCount = rows.filter((r) => r.status === "active").length;
  const delayedCount = rows.filter((r) => r.delayed).length;
  const toReviewTotal = rows.reduce((sum, r) => sum + r.toReviewCount, 0);
  const missingDocsTotal = rows.reduce((sum, r) => sum + r.missingDocsCount, 0);
  const budgetTotals = sumByCurrency(
    rows.map((r) => ({ amountMinor: r.budgetMinor, currencyCode: r.currencyCode })),
  );
  const spentTotals = sumByCurrency(
    rows.map((r) => ({ amountMinor: r.spentMinor, currencyCode: r.currencyCode })),
  );

  return (
    <div className="w-full max-w-3xl">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Projets actifs" value={activeCount} icon={FlagIcon} />
        <StatCard label="Clients" value={clientIds.size} icon={UsersIcon} />
        <StatCard
          label="Budget total"
          value={<MultiCurrencyAmount totals={budgetTotals} />}
          icon={BudgetIcon}
        />
        <StatCard
          label="Dépenses"
          value={<MultiCurrencyAmount totals={spentTotals} />}
          icon={ReceiptIcon}
        />
        <StatCard label="À vérifier" value={toReviewTotal} icon={ClockIcon} tone="warning" />
        <StatCard
          label="Documents manquants"
          value={missingDocsTotal}
          icon={AlertIcon}
          tone="danger"
        />
        <StatCard label="Projets en retard" value={delayedCount} icon={AlertIcon} tone="danger" />
      </div>

      <AgencyProjectsTable
        rows={rows}
        canEditProjects={canEditProjects}
        canDeleteProjects={canDeleteProjects}
      />
    </div>
  );
}
