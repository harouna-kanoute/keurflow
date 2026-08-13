import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  canApproveExpense,
  DOCUMENTATION_STATUS_LABEL,
  deriveDocumentationStatus,
  formatMoney,
  getBudgetConsumptionPercent,
  getFundingCoveragePercent,
  getFundingGap,
  getMilestoneProgressPercent,
  getRemainingBudget,
  getTotalFunded,
  hasOrgRoleAtLeast,
  hasProjectRoleAtLeast,
  isProjectDelayed,
} from "@keurflow/business";
import { CURRENCIES, EXPENSE_CATEGORIES, PROJECT_TYPES } from "@keurflow/config";
import type { OrganizationRole, ProjectRole } from "@keurflow/types";
import { createClient } from "@/lib/supabase/server";
import { Modal } from "@/components/modal";
import { DonutChart } from "@/components/donut-chart";
import { BarChart } from "@/components/bar-chart";
import { EditIcon, TrashIcon } from "@/components/icons";
import { EditProjectForm } from "../../edit-project-form";
import { CreateFundingForm } from "./create-funding-form";
import { CreateExpenseForm } from "./create-expense-form";
import { ExpenseStatusActions, ExpenseStatusBadge } from "./expense-status";
import { ExpenseComments, type ExpenseCommentView } from "./expense-comments";
import { AddMilestoneForm, MilestoneStatusSelect } from "./milestones";
import { PhotoGallery, UploadPhotoForm } from "./photos";
import { InviteMemberForm } from "./invite-member-form";
import { MemberRowActions } from "./member-actions";
import { CreateReportForm } from "./create-report-form";
import { DeleteProjectForm } from "./delete-project-form";
import { ProjectStatusSelect } from "./project-status";
import { ProjectTabs } from "./project-tabs";

function minorUnitFor(currencyCode: string): number {
  return CURRENCIES.find((c) => c.code === currencyCode)?.minorUnit ?? 2;
}

const STATUS_LABELS: Record<string, string> = {
  planning: "Planification",
  active: "Actif",
  paused: "En pause",
  completed: "Terminé",
  archived: "Archivé",
};

const CATEGORY_LABELS = new Map(EXPENSE_CATEGORIES.map((c) => [c.code, c.label]));
const PROJECT_TYPE_LABELS = new Map(PROJECT_TYPES.map((t) => [t.code, t.label]));

const PROJECT_ROLE_LABELS: Record<string, string> = {
  project_owner: "Propriétaire",
  project_manager: "Responsable",
  project_member: "Collaborateur",
  project_viewer: "Client (lecture seule)",
};

const MILESTONE_STATUS_LABELS: Record<string, string> = {
  pending: "À faire",
  in_progress: "En cours",
  completed: "Terminée",
  delayed: "En retard",
};

const MILESTONE_STATUS_COLORS: Record<string, string> = {
  pending: "text-slate-400 dark:text-slate-600",
  in_progress: "text-amber-500 dark:text-amber-400",
  completed: "text-green-500 dark:text-green-400",
  delayed: "text-red-500 dark:text-red-400",
};

const CATEGORY_CHART_COLORS = [
  "text-brand-600 dark:text-brand-500",
  "text-teal-500 dark:text-teal-400",
  "text-amber-500 dark:text-amber-400",
  "text-purple-500 dark:text-purple-400",
  "text-pink-500 dark:text-pink-400",
  "text-blue-500 dark:text-blue-400",
  "text-lime-500 dark:text-lime-400",
  "text-orange-500 dark:text-orange-400",
];

const MONTH_LABELS = [
  "Jan",
  "Fév",
  "Mars",
  "Avr",
  "Mai",
  "Juin",
  "Juil",
  "Août",
  "Sep",
  "Oct",
  "Nov",
  "Déc",
];

function formatCompact(amountMinor: number, minorUnit: number): string {
  const major = amountMinor / 10 ** minorUnit;
  return new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 }).format(
    major,
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  // RLS-scoped like the page itself — a project this viewer can't see
  // simply yields no row, so the tab title falls back to the generic label.
  const { data: project } = await supabase.from("projects").select("name").eq("id", id).maybeSingle();
  return { title: project ? `${project.name} — KeurFlow` : "Chantier — KeurFlow" };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // RLS (projects_select_org_or_project_members) returns nothing here if
  // this user can't see the project — including when the id was just
  // guessed from another tenant's data (spec §64/§82).
  const { data: project } = await supabase
    .from("projects")
    .select(
      "id, organization_id, name, description, project_type, country_id, city, address, surface_area, status, budget_minor, currency_code, start_date, expected_end_date",
    )
    .eq("id", id)
    .maybeSingle();

  if (!project) {
    notFound();
  }

  const { data: country } = await supabase
    .from("countries")
    .select("name")
    .eq("id", project.country_id)
    .maybeSingle();

  const { data: fundings } = await supabase
    .from("fundings")
    .select("id, amount_minor, currency_code, payment_method_id, reference, funding_date")
    .eq("project_id", project.id)
    .order("funding_date", { ascending: false });

  const { data: paymentMethods } = await supabase.from("payment_methods").select("id, label");
  const paymentMethodLabels = new Map((paymentMethods ?? []).map((m) => [m.id, m.label]));

  const fundingList = (fundings ?? []).map((f) => ({ amountMinor: f.amount_minor }));
  const totalFunded = getTotalFunded(fundingList);
  const fundingGap = getFundingGap(project.budget_minor, fundingList);
  const coveragePercent = getFundingCoveragePercent(project.budget_minor, fundingList);
  const minorUnit = minorUnitFor(project.currency_code);

  const { data: expenses } = await supabase
    .from("expenses")
    .select("id, amount_minor, currency_code, category, supplier_name, expense_date, status")
    .eq("project_id", project.id)
    .order("expense_date", { ascending: false });

  const { data: documents } = await supabase
    .from("documents")
    .select("expense_id")
    .eq("project_id", project.id)
    .not("expense_id", "is", null);

  const documentCountByExpense = new Map<string, number>();
  for (const doc of documents ?? []) {
    if (!doc.expense_id) continue;
    documentCountByExpense.set(doc.expense_id, (documentCountByExpense.get(doc.expense_id) ?? 0) + 1);
  }

  const expenseIds = (expenses ?? []).map((e) => e.id);
  const { data: expenseComments } =
    expenseIds.length > 0
      ? await supabase
          .from("expense_comments")
          .select("id, expense_id, user_id, content, created_at")
          .in("expense_id", expenseIds)
          .order("created_at", { ascending: true })
      : { data: [] };

  const commenterIds = [...new Set((expenseComments ?? []).map((c) => c.user_id))];
  const { data: commenterProfiles } =
    commenterIds.length > 0
      ? await supabase.from("profiles").select("id, full_name").in("id", commenterIds)
      : { data: [] };
  const commenterNames = new Map((commenterProfiles ?? []).map((p) => [p.id, p.full_name ?? "Utilisateur"]));

  const commentsByExpense = new Map<string, ExpenseCommentView[]>();
  for (const c of expenseComments ?? []) {
    const list = commentsByExpense.get(c.expense_id) ?? [];
    list.push({
      id: c.id,
      authorName: commenterNames.get(c.user_id) ?? "Utilisateur",
      content: c.content,
      createdAt: c.created_at,
    });
    commentsByExpense.set(c.expense_id, list);
  }

  // Determines whether to render the approve/reject/needs-info buttons —
  // UI convenience only. RLS (expenses_update_own_pending_or_managers) is
  // the actual authority on whether the update succeeds (§69/§83).
  const { data: orgMembership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", project.organization_id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  const { data: projectMembership } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", project.id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  const canApprove =
    (!!orgMembership && hasOrgRoleAtLeast(orgMembership.role as OrganizationRole, "manager")) ||
    (!!projectMembership && canApproveExpense(projectMembership.role as ProjectRole));

  // Deletion is a higher bar than canApprove — org owners/admins or the
  // project's own owner, not managers (see deleteProject's own check,
  // which RLS re-validates authoritatively either way).
  const canDelete =
    (!!orgMembership && hasOrgRoleAtLeast(orgMembership.role as OrganizationRole, "admin")) ||
    (!!projectMembership &&
      hasProjectRoleAtLeast(projectMembership.role as ProjectRole, "project_owner"));

  // Matches projects_update_org_managers_or_project_owners (RLS) — org
  // managers+ or the project's own owner, same bar as updateProject's own
  // check re-validates authoritatively either way.
  const canEdit =
    (!!orgMembership && hasOrgRoleAtLeast(orgMembership.role as OrganizationRole, "manager")) ||
    (!!projectMembership &&
      hasProjectRoleAtLeast(projectMembership.role as ProjectRole, "project_owner"));

  const expenseList = (expenses ?? []).map((e) => ({
    amountMinor: e.amount_minor,
    status: e.status as "pending" | "needs_information" | "approved" | "rejected",
  }));
  const approvedTotal = getBudgetConsumptionPercent(project.budget_minor, expenseList);
  const remainingBudget = getRemainingBudget(project.budget_minor, expenseList);
  const spentApproved = project.budget_minor - remainingBudget;

  const { data: milestones } = await supabase
    .from("milestones")
    .select("id, name, status")
    .eq("project_id", project.id)
    .order("order_index", { ascending: true });

  const { data: photoRows } = await supabase
    .from("photos")
    .select("id, storage_path, caption")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false })
    .limit(30);

  let photos: { id: string; url: string | null; caption: string | null }[] = [];
  if (photoRows && photoRows.length > 0) {
    const { data: signedUrls } = await supabase.storage
      .from("project-photos")
      .createSignedUrls(
        photoRows.map((p) => p.storage_path),
        3600,
      );
    photos = photoRows.map((p, i) => ({
      id: p.id,
      caption: p.caption,
      url: signedUrls?.[i]?.signedUrl ?? null,
    }));
  }

  const { data: members } = await supabase
    .from("project_members")
    .select("id, user_id, role, status")
    .eq("project_id", project.id)
    .order("created_at", { ascending: true });

  // profiles_select_shared_context (Phase 12) is what makes these names
  // visible — without it, this query would only ever return the caller's
  // own profile row, per profiles_select_own.
  const memberProfiles = members?.length
    ? await supabase
        .from("profiles")
        .select("id, full_name")
        .in(
          "id",
          members.map((m) => m.user_id),
        )
    : { data: [] };
  const memberNames = new Map((memberProfiles.data ?? []).map((p) => [p.id, p.full_name]));

  const { data: reports } = await supabase
    .from("reports")
    .select("id, period_start, period_end, summary, created_at")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  // Aperçu charts — derived from data already fetched above (budget,
  // expenses, milestones), no extra queries. Category/monthly totals only
  // count approved expenses, matching "Dépensé (approuvé)" elsewhere on
  // this page — pending/rejected amounts aren't real spend yet.
  const approvedExpenses = (expenses ?? []).filter((e) => e.status === "approved");

  const categoryTotalsMap = new Map<string, number>();
  for (const e of approvedExpenses) {
    categoryTotalsMap.set(e.category, (categoryTotalsMap.get(e.category) ?? 0) + e.amount_minor);
  }
  const categoryBreakdown = Array.from(categoryTotalsMap.entries())
    .map(([code, amountMinor], index) => ({
      code,
      label: CATEGORY_LABELS.get(code) ?? code,
      amountMinor,
      colorClassName: CATEGORY_CHART_COLORS[index % CATEGORY_CHART_COLORS.length],
    }))
    .sort((a, b) => b.amountMinor - a.amountMinor);

  const monthlyTotalsMap = new Map<string, number>();
  for (const e of approvedExpenses) {
    const d = new Date(e.expense_date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyTotalsMap.set(key, (monthlyTotalsMap.get(key) ?? 0) + e.amount_minor);
  }
  const monthlyTotals = Array.from(monthlyTotalsMap.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .slice(-6)
    .map(([key, amountMinor]) => {
      const [year, month] = key.split("-").map(Number);
      return { label: `${MONTH_LABELS[month - 1]} ${String(year).slice(2)}`, amountMinor };
    });

  const milestoneStatusCountsMap = new Map<string, number>();
  for (const m of milestones ?? []) {
    milestoneStatusCountsMap.set(m.status, (milestoneStatusCountsMap.get(m.status) ?? 0) + 1);
  }
  const milestoneStatusBreakdown = ["pending", "in_progress", "completed", "delayed"]
    .map((status) => ({
      status,
      label: MILESTONE_STATUS_LABELS[status],
      count: milestoneStatusCountsMap.get(status) ?? 0,
      colorClassName: MILESTONE_STATUS_COLORS[status],
    }))
    .filter((s) => s.count > 0);
  const milestoneProgressPercent = getMilestoneProgressPercent(
    (milestones ?? []).map((m) => ({
      status: m.status as "pending" | "in_progress" | "completed" | "delayed",
    })),
  );

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-canvas px-6 py-10">
      <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-8">
        <div>
          <Link
            href="/dashboard"
            className="text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          >
            ← Retour
          </Link>

          <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
                {project.name}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                <span>
                  {[project.address, project.city].filter(Boolean).join(", ")}
                  {project.address || project.city ? " — " : ""}
                </span>
                {canApprove ? (
                  <ProjectStatusSelect projectId={project.id} status={project.status} />
                ) : (
                  <span>{STATUS_LABELS[project.status] ?? project.status}</span>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href={`/dashboard/projects/${project.id}/a-verifier`}
                className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-500 dark:border-slate-700 dark:text-slate-300"
              >
                À vérifier
              </Link>
              {canEdit && (
                <Modal
                  triggerLabel="Modifier le chantier"
                  triggerIcon={<EditIcon className="h-4 w-4" />}
                  title="Modifier le chantier"
                  variant="icon"
                  iconOnly
                >
                  <EditProjectForm
                    projectId={project.id}
                    currencyCode={project.currency_code}
                    defaultValues={{
                      name: project.name,
                      description: project.description,
                      projectType: project.project_type,
                      city: project.city,
                      budgetMinor: project.budget_minor,
                      address: project.address,
                      surfaceArea: project.surface_area,
                      startDate: project.start_date,
                      expectedEndDate: project.expected_end_date,
                    }}
                  />
                </Modal>
              )}
              {canDelete && (
                <Modal
                  triggerLabel="Supprimer le chantier"
                  triggerIcon={<TrashIcon className="h-4 w-4" />}
                  title="Supprimer le chantier"
                  variant="icon-danger"
                  iconOnly
                >
                  <DeleteProjectForm projectId={project.id} projectName={project.name} />
                </Modal>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
            Informations du chantier
          </p>
          <dl className="mt-4 grid w-full min-w-0 grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-8">
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Type</dt>
              <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-50">
                {PROJECT_TYPE_LABELS.get(project.project_type) ?? project.project_type}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Pays</dt>
              <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-50">
                {country?.name ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Ville</dt>
              <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-50">
                {project.city ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Adresse</dt>
              <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-50">
                {project.address ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Superficie</dt>
              <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-50">
                {project.surface_area != null ? `${project.surface_area} m²` : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Date de début</dt>
              <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-50">
                {project.start_date ? new Date(project.start_date).toLocaleDateString("fr-FR") : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Fin prévue</dt>
              <dd className="mt-0.5 flex items-center gap-2 font-medium text-slate-900 dark:text-slate-50">
                {project.expected_end_date
                  ? new Date(project.expected_end_date).toLocaleDateString("fr-FR")
                  : "—"}
                {isProjectDelayed(
                  project.expected_end_date,
                  project.status as "planning" | "active" | "paused" | "completed" | "archived",
                ) && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-400">
                    En retard
                  </span>
                )}
              </dd>
            </div>
          </dl>
          {project.description && (
            <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
              <dt className="text-sm text-slate-500 dark:text-slate-400">Description</dt>
              <dd className="mt-1 text-sm whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                {project.description}
              </dd>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
            Budget
          </p>
          <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
            <DonutChart
              size={112}
              strokeWidth={12}
              total={Math.max(project.budget_minor, spentApproved)}
              segments={[
                { value: spentApproved, colorClassName: "text-brand-600 dark:text-brand-500" },
              ]}
              centerLabel={`${approvedTotal}%`}
              centerSublabel="dépensé"
            />
            <dl className="grid w-full min-w-0 grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-8">
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Budget</dt>
                <dd className="mt-0.5 text-lg font-semibold text-slate-900 dark:text-slate-50">
                  {formatMoney(project.budget_minor, project.currency_code, minorUnit)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Financé ({coveragePercent}%)</dt>
                <dd className="mt-0.5 text-lg font-semibold text-slate-900 dark:text-slate-50">
                  {formatMoney(totalFunded, project.currency_code, minorUnit)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">
                  {fundingGap >= 0 ? "Reste à financer" : "Financé en excédent"}
                </dt>
                <dd className="mt-0.5 text-lg font-semibold text-slate-900 dark:text-slate-50">
                  {formatMoney(Math.abs(fundingGap), project.currency_code, minorUnit)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Dépensé (approuvé)</dt>
                <dd className="mt-0.5 text-lg font-semibold text-slate-900 dark:text-slate-50">
                  {formatMoney(spentApproved, project.currency_code, minorUnit)}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <ProjectTabs
          counts={{
            apercu: 0,
            financements: fundings?.length ?? 0,
            depenses: expenses?.length ?? 0,
            etapes: milestones?.length ?? 0,
            photos: photos.length,
            membres: members?.length ?? 0,
            rapports: reports?.length ?? 0,
          }}
          panels={{
            apercu: (
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Dépenses par catégorie
                  </p>
                  {categoryBreakdown.length > 0 ? (
                    <div className="mt-4 flex items-center gap-6">
                      <DonutChart
                        size={96}
                        strokeWidth={12}
                        segments={categoryBreakdown.map((c) => ({
                          value: c.amountMinor,
                          colorClassName: c.colorClassName,
                        }))}
                      />
                      <ul className="flex flex-1 flex-col gap-1.5 text-xs">
                        {categoryBreakdown.map((c) => (
                          <li key={c.code} className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                              <span
                                className={`h-2 w-2 shrink-0 rounded-full bg-current ${c.colorClassName}`}
                              />
                              {c.label}
                            </span>
                            <span className="shrink-0 text-slate-900 dark:text-slate-100">
                              {formatMoney(c.amountMinor, project.currency_code, minorUnit)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                      Aucune dépense approuvée.
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Avancement des étapes
                  </p>
                  {milestones && milestones.length > 0 ? (
                    <div className="mt-4 flex items-center gap-6">
                      <DonutChart
                        size={96}
                        strokeWidth={12}
                        segments={milestoneStatusBreakdown.map((s) => ({
                          value: s.count,
                          colorClassName: s.colorClassName,
                        }))}
                        centerLabel={`${milestoneProgressPercent}%`}
                        centerSublabel="fait"
                      />
                      <ul className="flex flex-1 flex-col gap-1.5 text-xs">
                        {milestoneStatusBreakdown.map((s) => (
                          <li key={s.status} className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                              <span
                                className={`h-2 w-2 shrink-0 rounded-full bg-current ${s.colorClassName}`}
                              />
                              {s.label}
                            </span>
                            <span className="shrink-0 text-slate-900 dark:text-slate-100">
                              {s.count}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Aucune étape.</p>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800 sm:col-span-2">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Dépenses approuvées par mois ({project.currency_code})
                  </p>
                  {monthlyTotals.length > 0 ? (
                    <div className="mt-4">
                      <BarChart
                        data={monthlyTotals.map((m) => ({ label: m.label, value: m.amountMinor }))}
                        formatValue={(v) => formatCompact(v, minorUnit)}
                      />
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                      Aucune dépense approuvée.
                    </p>
                  )}
                </div>
              </div>
            ),
            financements: (
              <div>
                <div className="flex justify-end">
                  <Modal triggerLabel="Financement" title="Nouveau financement" variant="secondary">
                    <CreateFundingForm
                      projectId={project.id}
                      currencyCode={project.currency_code}
                      minorUnit={minorUnit}
                    />
                  </Modal>
                </div>
                {fundings && fundings.length > 0 ? (
                  <ul className="mt-3 flex flex-col gap-2">
                    {fundings.map((funding) => (
                      <li
                        key={funding.id}
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900"
                      >
                        <span className="text-slate-900 dark:text-slate-100">
                          {paymentMethodLabels.get(funding.payment_method_id) ?? "—"}
                          {funding.reference ? ` · ${funding.reference}` : ""}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400">
                          {formatMoney(funding.amount_minor, funding.currency_code, minorUnit)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                    Aucun financement enregistré.
                  </p>
                )}
              </div>
            ),
            depenses: (
              <div>
                <div className="flex justify-end">
                  <Modal triggerLabel="Dépense" title="Nouvelle dépense" variant="secondary">
                    <CreateExpenseForm
                      projectId={project.id}
                      currencyCode={project.currency_code}
                      minorUnit={minorUnit}
                    />
                  </Modal>
                </div>
                {expenses && expenses.length > 0 ? (
                  <ul className="mt-3 flex flex-col gap-2">
                    {expenses.map((expense) => {
                      const documentationStatus = deriveDocumentationStatus(
                        documentCountByExpense.get(expense.id) ?? 0,
                      );
                      return (
                        <li
                          key={expense.id}
                          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-slate-900 dark:text-slate-100">
                              {CATEGORY_LABELS.get(expense.category) ?? expense.category}
                              {expense.supplier_name ? ` · ${expense.supplier_name}` : ""}
                            </span>
                            <span className="text-slate-500 dark:text-slate-400">
                              {formatMoney(expense.amount_minor, expense.currency_code, minorUnit)}
                            </span>
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <ExpenseStatusBadge status={expense.status} />
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {DOCUMENTATION_STATUS_LABEL[documentationStatus]}
                            </span>
                          </div>
                          <ExpenseStatusActions expenseId={expense.id} canApprove={canApprove} />
                          <ExpenseComments
                            expenseId={expense.id}
                            comments={commentsByExpense.get(expense.id) ?? []}
                          />
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                    Aucune dépense enregistrée.
                  </p>
                )}
              </div>
            ),
            etapes: (
              <div>
                <div className="flex justify-end">
                  <Modal triggerLabel="Étape" title="Nouvelle étape" variant="secondary">
                    <AddMilestoneForm projectId={project.id} nextOrderIndex={milestones?.length ?? 0} />
                  </Modal>
                </div>
                {milestones && milestones.length > 0 ? (
                  <ul className="mt-3 flex flex-col gap-2">
                    {milestones.map((milestone) => (
                      <li
                        key={milestone.id}
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900"
                      >
                        <span className="text-slate-900 dark:text-slate-100">{milestone.name}</span>
                        <MilestoneStatusSelect milestone={milestone} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Aucune étape.</p>
                )}
              </div>
            ),
            photos: (
              <div>
                <div className="flex justify-end">
                  <Modal triggerLabel="Photo" title="Ajouter une photo" variant="secondary">
                    <UploadPhotoForm projectId={project.id} />
                  </Modal>
                </div>
                <div className="mt-3">
                  <PhotoGallery photos={photos} />
                </div>
              </div>
            ),
            membres: (
              <div>
                <div className="flex justify-end">
                  {canApprove && (
                    <Modal triggerLabel="Inviter" title="Inviter un membre" variant="secondary">
                      <InviteMemberForm projectId={project.id} />
                    </Modal>
                  )}
                </div>
                {members && members.length > 0 ? (
                  <ul className="mt-3 flex flex-col gap-2">
                    {members.map((member) => (
                      <li
                        key={member.id}
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900"
                      >
                        <span className="text-slate-900 dark:text-slate-100">
                          {memberNames.get(member.user_id) ?? "Membre"}
                          {member.status === "invited" && (
                            <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                              (invité·e)
                            </span>
                          )}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 dark:text-slate-400">
                            {PROJECT_ROLE_LABELS[member.role] ?? member.role}
                          </span>
                          <MemberRowActions
                            memberId={member.id}
                            memberName={memberNames.get(member.user_id) ?? "ce membre"}
                            role={member.role}
                            canManage={canApprove}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Aucun membre.</p>
                )}
              </div>
            ),
            rapports: (
              <div>
                <div className="flex justify-end">
                  <Modal triggerLabel="Rapport" title="Générer un rapport" variant="secondary">
                    <CreateReportForm projectId={project.id} />
                  </Modal>
                </div>
                {reports && reports.length > 0 ? (
                  <ul className="mt-3 flex flex-col gap-2">
                    {reports.map((report) => (
                      <li
                        key={report.id}
                        className="rounded-xl border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-900"
                      >
                        <details>
                          <summary className="cursor-pointer text-slate-900 dark:text-slate-100">
                            {report.period_start} → {report.period_end}
                          </summary>
                          <pre className="mt-3 whitespace-pre-wrap font-sans text-slate-600 dark:text-slate-400">
                            {report.summary}
                          </pre>
                        </details>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                    Aucun rapport généré.
                  </p>
                )}
              </div>
            ),
          }}
        />
      </div>
    </div>
  );
}
