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
  hasProjectRoleAtLeast,
} from "@keurflow/business";
import { CURRENCIES, EXPENSE_CATEGORIES } from "@keurflow/config";
import type { OrganizationRole, ProjectRole } from "@keurflow/types";
import { createClient } from "@/lib/supabase/server";
import { Modal } from "@/components/modal";
import { DonutChart } from "@/components/donut-chart";
import { CreateFundingForm } from "./create-funding-form";
import { CreateExpenseForm } from "./create-expense-form";
import { ExpenseStatusActions, ExpenseStatusBadge } from "./expense-status";
import { ExpenseComments, type ExpenseCommentView } from "./expense-comments";
import { AddMilestoneForm, MilestoneStatusSelect } from "./milestones";
import { PhotoGallery, UploadPhotoForm } from "./photos";
import { InviteMemberForm } from "./invite-member-form";
import { CreateReportForm } from "./create-report-form";
import { DeleteProjectForm } from "./delete-project-form";

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

function SectionHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
        {title}
      </p>
      {children}
    </div>
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
      "id, organization_id, name, project_type, city, address, surface_area, status, budget_minor, currency_code",
    )
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

  return (
    <div className="flex flex-1 flex-col bg-canvas px-6 py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
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
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {[project.address, project.city].filter(Boolean).join(", ")}
                {project.address || project.city ? " — " : ""}
                {STATUS_LABELS[project.status] ?? project.status}
              </p>
            </div>
            <Link
              href={`/dashboard/projects/${project.id}/a-verifier`}
              className="shrink-0 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-500 dark:border-slate-700 dark:text-slate-300"
            >
              À vérifier
            </Link>
          </div>
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
            <dl className="grid w-full grid-cols-2 gap-x-6 gap-y-4 text-sm lg:grid-cols-4 lg:gap-x-8">
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
              {project.surface_area != null && (
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">Superficie</dt>
                  <dd className="mt-0.5 text-lg font-semibold text-slate-900 dark:text-slate-50">
                    {project.surface_area} m²
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="flex flex-col gap-8">
            <div>
              <SectionHeader title="Financements">
                <Modal triggerLabel="Financement" title="Nouveau financement" variant="secondary">
                  <CreateFundingForm
                    projectId={project.id}
                    currencyCode={project.currency_code}
                    minorUnit={minorUnit}
                  />
                </Modal>
              </SectionHeader>
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

            <div>
              <SectionHeader title="Dépenses">
                <Modal triggerLabel="Dépense" title="Nouvelle dépense" variant="secondary">
                  <CreateExpenseForm
                    projectId={project.id}
                    currencyCode={project.currency_code}
                    minorUnit={minorUnit}
                  />
                </Modal>
              </SectionHeader>
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
          </div>

          <div className="flex flex-col gap-8">
            <div>
              <SectionHeader title="Étapes">
                <Modal triggerLabel="Étape" title="Nouvelle étape" variant="secondary">
                  <AddMilestoneForm projectId={project.id} nextOrderIndex={milestones?.length ?? 0} />
                </Modal>
              </SectionHeader>
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

            <div>
              <SectionHeader title="Photos">
                <Modal triggerLabel="Photo" title="Ajouter une photo" variant="secondary">
                  <UploadPhotoForm projectId={project.id} />
                </Modal>
              </SectionHeader>
              <div className="mt-3">
                <PhotoGallery photos={photos} />
              </div>
            </div>

            <div>
              <SectionHeader title="Membres">
                {canApprove && (
                  <Modal triggerLabel="Inviter" title="Inviter un membre" variant="secondary">
                    <InviteMemberForm projectId={project.id} />
                  </Modal>
                )}
              </SectionHeader>
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
                      <span className="text-slate-500 dark:text-slate-400">
                        {PROJECT_ROLE_LABELS[member.role] ?? member.role}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Aucun membre.</p>
              )}
            </div>

            <div>
              <SectionHeader title="Rapports">
                <Modal triggerLabel="Rapport" title="Générer un rapport" variant="secondary">
                  <CreateReportForm projectId={project.id} />
                </Modal>
              </SectionHeader>
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
          </div>
        </div>

        {canDelete && (
          <div className="rounded-2xl border border-red-200 bg-red-50/50 p-6 dark:border-red-900 dark:bg-red-900/10">
            <SectionHeader title="Zone de danger" />
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              La suppression du chantier est définitive et irréversible.
            </p>
            <div className="mt-4">
              <Modal
                triggerLabel="Supprimer le chantier"
                triggerIcon={<span aria-hidden />}
                title="Supprimer le chantier"
                variant="danger"
              >
                <DeleteProjectForm projectId={project.id} projectName={project.name} />
              </Modal>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
