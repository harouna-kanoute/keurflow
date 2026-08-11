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
  getRemainingBudget,
  getTotalFunded,
  hasOrgRoleAtLeast,
} from "@keurflow/business";
import { CURRENCIES, EXPENSE_CATEGORIES } from "@keurflow/config";
import type { OrganizationRole, ProjectRole } from "@keurflow/types";
import { createClient } from "@/lib/supabase/server";
import { CreateFundingForm } from "./create-funding-form";
import { CreateExpenseForm } from "./create-expense-form";
import { ExpenseStatusActions, ExpenseStatusBadge } from "./expense-status";
import { AddMilestoneForm, MilestoneStatusSelect } from "./milestones";
import { PhotoGallery, UploadPhotoForm } from "./photos";
import { InviteMemberForm } from "./invite-member-form";
import { CreateReportForm } from "./create-report-form";

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

const PROJECT_ROLE_LABELS: Record<string, string> = {
  project_owner: "Propriétaire",
  project_manager: "Responsable",
  project_member: "Collaborateur",
  project_viewer: "Client (lecture seule)",
};

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
    .select("id, organization_id, name, project_type, city, status, budget_minor, currency_code")
    .eq("id", id)
    .maybeSingle();

  if (!project) {
    notFound();
  }

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

  const expenseList = (expenses ?? []).map((e) => ({
    amountMinor: e.amount_minor,
    status: e.status as "pending" | "needs_information" | "approved" | "rejected",
  }));
  const approvedTotal = getBudgetConsumptionPercent(project.budget_minor, expenseList);
  const remainingBudget = getRemainingBudget(project.budget_minor, expenseList);

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

  return (
    <div className="flex flex-1 flex-col items-center gap-6 bg-zinc-50 px-6 py-16 dark:bg-black">
      <div className="w-full max-w-lg">
        <Link
          href="/dashboard"
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          ← Retour
        </Link>

        <div className="mt-4 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
              {project.name}
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {project.city ? `${project.city} — ` : ""}
              {STATUS_LABELS[project.status] ?? project.status}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 text-left shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            Budget
          </p>
          <p className="mt-1 text-2xl font-semibold text-black dark:text-zinc-50">
            {formatMoney(project.budget_minor, project.currency_code, minorUnit)}
          </p>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className="h-full rounded-full bg-black dark:bg-white"
              style={{ width: `${coveragePercent}%` }}
            />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-zinc-500 dark:text-zinc-400">Financé</dt>
            <dd className="text-right text-zinc-900 dark:text-zinc-100">
              {formatMoney(totalFunded, project.currency_code, minorUnit)} ({coveragePercent}%)
            </dd>
            <dt className="text-zinc-500 dark:text-zinc-400">
              {fundingGap >= 0 ? "Reste à financer" : "Financé en excédent"}
            </dt>
            <dd className="text-right text-zinc-900 dark:text-zinc-100">
              {formatMoney(Math.abs(fundingGap), project.currency_code, minorUnit)}
            </dd>
            <dt className="text-zinc-500 dark:text-zinc-400">Dépensé (approuvé)</dt>
            <dd className="text-right text-zinc-900 dark:text-zinc-100">
              {formatMoney(project.budget_minor - remainingBudget, project.currency_code, minorUnit)} (
              {approvedTotal}%)
            </dd>
          </dl>
        </div>

        <div className="mt-6">
          <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            Financements
          </p>
          {fundings && fundings.length > 0 ? (
            <ul className="mt-2 flex flex-col gap-2">
              {fundings.map((funding) => (
                <li
                  key={funding.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <span className="text-zinc-900 dark:text-zinc-100">
                    {paymentMethodLabels.get(funding.payment_method_id) ?? "—"}
                    {funding.reference ? ` · ${funding.reference}` : ""}
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {formatMoney(funding.amount_minor, funding.currency_code, minorUnit)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Aucun financement enregistré.
            </p>
          )}
          <CreateFundingForm
            projectId={project.id}
            currencyCode={project.currency_code}
            minorUnit={minorUnit}
          />
        </div>

        <div className="mt-6">
          <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            Dépenses
          </p>
          {expenses && expenses.length > 0 ? (
            <ul className="mt-2 flex flex-col gap-2">
              {expenses.map((expense) => {
                const documentationStatus = deriveDocumentationStatus(
                  documentCountByExpense.get(expense.id) ?? 0,
                );
                return (
                  <li
                    key={expense.id}
                    className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-900 dark:text-zinc-100">
                        {CATEGORY_LABELS.get(expense.category) ?? expense.category}
                        {expense.supplier_name ? ` · ${expense.supplier_name}` : ""}
                      </span>
                      <span className="text-zinc-500 dark:text-zinc-400">
                        {formatMoney(expense.amount_minor, expense.currency_code, minorUnit)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <ExpenseStatusBadge status={expense.status} />
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {DOCUMENTATION_STATUS_LABEL[documentationStatus]}
                      </span>
                    </div>
                    <ExpenseStatusActions expenseId={expense.id} canApprove={canApprove} />
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Aucune dépense enregistrée.
            </p>
          )}
          <CreateExpenseForm
            projectId={project.id}
            currencyCode={project.currency_code}
            minorUnit={minorUnit}
          />
        </div>

        <div className="mt-6">
          <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            Étapes
          </p>
          {milestones && milestones.length > 0 ? (
            <ul className="mt-2 flex flex-col gap-2">
              {milestones.map((milestone) => (
                <li
                  key={milestone.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <span className="text-zinc-900 dark:text-zinc-100">{milestone.name}</span>
                  <MilestoneStatusSelect milestone={milestone} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Aucune étape.</p>
          )}
          <AddMilestoneForm projectId={project.id} nextOrderIndex={milestones?.length ?? 0} />
        </div>

        <div className="mt-6">
          <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            Photos
          </p>
          <PhotoGallery photos={photos} />
          <UploadPhotoForm projectId={project.id} />
        </div>

        <div className="mt-6">
          <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            Membres
          </p>
          {members && members.length > 0 ? (
            <ul className="mt-2 flex flex-col gap-2">
              {members.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <span className="text-zinc-900 dark:text-zinc-100">
                    {memberNames.get(member.user_id) ?? "Membre"}
                    {member.status === "invited" && (
                      <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                        (invité·e)
                      </span>
                    )}
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {PROJECT_ROLE_LABELS[member.role] ?? member.role}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Aucun membre.</p>
          )}
          {canApprove && <InviteMemberForm projectId={project.id} />}
        </div>

        <div className="mt-6">
          <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            Rapports
          </p>
          {reports && reports.length > 0 ? (
            <ul className="mt-2 flex flex-col gap-2">
              {reports.map((report) => (
                <li
                  key={report.id}
                  className="rounded-xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <details>
                    <summary className="cursor-pointer text-zinc-900 dark:text-zinc-100">
                      {report.period_start} → {report.period_end}
                    </summary>
                    <pre className="mt-3 whitespace-pre-wrap font-sans text-zinc-600 dark:text-zinc-400">
                      {report.summary}
                    </pre>
                  </details>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Aucun rapport généré.
            </p>
          )}
          <CreateReportForm projectId={project.id} />
        </div>
      </div>
    </div>
  );
}
