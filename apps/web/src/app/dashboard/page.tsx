import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  formatMoney,
  getApprovedExpensesTotal,
  getMilestoneProgressPercent,
  getTotalFunded,
  getTrialDaysRemaining,
  hasOrgRoleAtLeast,
  isBillablePlan,
} from "@keurflow/business";
import { CURRENCIES } from "@keurflow/config";
import type { OrganizationRole } from "@keurflow/types";
import { createClient } from "@/lib/supabase/server";
import { Modal } from "@/components/modal";
import { DonutChart } from "@/components/donut-chart";
import { BellIcon, EditIcon } from "@/components/icons";
import { CreateOrganizationForm } from "./create-organization-form";
import { EditOrganizationForm } from "./edit-organization-form";
import { CreateProjectForm } from "./create-project-form";
import { AgencyDashboard } from "./agency-dashboard";
import { ProjectActionsMenu } from "./project-actions-menu";

function minorUnitFor(currencyCode: string): number {
  return CURRENCIES.find((c) => c.code === currencyCode)?.minorUnit ?? 2;
}

const ORGANIZATION_TYPE_LABELS: Record<string, string> = {
  individual: "Particulier",
  agency: "Agence immobilière",
  company: "Entreprise",
};

const PROJECT_ROLE_LABELS: Record<string, string> = {
  project_owner: "Propriétaire",
  project_manager: "Responsable",
  project_approver: "Propriétaire du chantier",
  project_member: "Collaborateur",
  project_viewer: "Client (lecture seule)",
};

export const metadata: Metadata = { title: "Tableau de bord — KeurFlow" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  // RLS (organization_members_select_same_org / organizations_select_members)
  // only ever returns rows for organizations this user actually belongs to —
  // no cross-tenant leakage possible here even if these queries were
  // tampered with client-side. Two queries (not a nested embed) because the
  // JS client can't infer embed cardinality without generated DB types (Phase 4).
  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  const { data: organization } = membership
    ? await supabase
        .from("organizations")
        .select("id, name, type, address, phone, email")
        .eq("id", membership.organization_id)
        .single()
    : { data: null };

  // Matches the organizations_update_admins RLS policy — only an owner/admin
  // can actually update the org; this just decides whether to show the button.
  const canEditOrganization =
    !!membership && hasOrgRoleAtLeast(membership.role as OrganizationRole, "admin");

  const { count: memberCount } = organization
    ? await supabase
        .from("organization_members")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organization.id)
        .eq("status", "active")
    : { count: null };

  // RLS (subscriptions_select_members) scopes this the same way — a
  // subscription row always exists once an organization does (§15, Phase 15).
  const { data: subscription } = organization
    ? await supabase
        .from("subscriptions")
        .select("plan_code, status, trial_ends_at")
        .eq("organization_id", organization.id)
        .single()
    : { data: null };

  const showTrialBanner =
    !!subscription && isBillablePlan(subscription.plan_code) && subscription.status === "trialing";
  const trialDaysRemaining = subscription ? getTrialDaysRemaining(subscription.trial_ends_at) : 0;

  // Agencies/companies get a different view (AgencyDashboard, §10) — it does
  // its own project/expense/document/member fetching, so the individual
  // "Mes projets" queries below are skipped entirely for those org types.
  const isAgencyView = organization?.type === "agency" || organization?.type === "company";

  // UI convenience only (§69/§83) — the RLS update/delete policies on
  // `projects` are the actual authority, re-checked server-side by
  // updateProject/deleteProject regardless of what's shown here.
  const canEditProjects = !!membership && hasOrgRoleAtLeast(membership.role as OrganizationRole, "manager");
  const canDeleteProjects = !!membership && hasOrgRoleAtLeast(membership.role as OrganizationRole, "admin");

  // RLS (projects_select_org_or_project_members) filters this to projects
  // this user can actually see — filtering by organization_id here is just
  // for clarity, not the security boundary itself.
  const { data: projects } = organization && !isAgencyView
    ? await supabase
        .from("projects")
        .select(
          "id, name, description, project_type, status, budget_minor, currency_code, city, address, surface_area, start_date, expected_end_date",
        )
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false })
    : { data: null };

  // Per-project aggregates for the "Mes projets" view (§47: progression,
  // budget, financé, dépensé, à vérifier). Plain per-table queries, each
  // already RLS-scoped — fine at B2C scale (a handful of projects).
  const projectSummaries = await Promise.all(
    (projects ?? []).map(async (project) => {
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
    }),
  );

  // Chantiers where this user is a project_members collaborator but not
  // (necessarily) an organization_members staff member — e.g. a client or
  // family member invited directly onto a chantier by an agency they don't
  // otherwise belong to. RLS (projects_select_org_or_project_members) is
  // what actually allows these reads; the "Mes projets" query above only
  // ever covers the user's own organization, so without this section an
  // invited-only collaborator with no organization sees a dead end.
  const { data: collaboratorMemberships } = await supabase
    .from("project_members")
    .select("project_id, role")
    .eq("user_id", user.id)
    .eq("status", "active");

  const collaboratorProjectIds = (collaboratorMemberships ?? []).map((m) => m.project_id);
  const { data: collaboratorProjectsRaw } = collaboratorProjectIds.length
    ? await supabase
        .from("projects")
        .select("id, name, status, organization_id, budget_minor, currency_code")
        .in("id", collaboratorProjectIds)
    : { data: [] };

  // Excludes the user's own organization's projects — those are already
  // shown above via "Mes projets" / AgencyDashboard, no need to duplicate.
  const collaboratorProjects = (collaboratorProjectsRaw ?? []).filter(
    (p) => p.organization_id !== organization?.id,
  );

  const collaboratorOrgIds = [...new Set(collaboratorProjects.map((p) => p.organization_id))];
  const { data: collaboratorOrgs } = collaboratorOrgIds.length
    ? await supabase.from("organizations").select("id, name").in("id", collaboratorOrgIds)
    : { data: [] };
  const collaboratorOrgNames = new Map((collaboratorOrgs ?? []).map((o) => [o.id, o.name]));
  const collaboratorRoleByProjectId = new Map(
    (collaboratorMemberships ?? []).map((m) => [m.project_id, m.role]),
  );

  return (
    <div className="flex flex-1 flex-col bg-canvas px-6 py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div>
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 px-6 pt-8 pb-14 sm:px-8">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 1px, transparent 14px)",
              }}
            />
            <div className="relative flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold text-white">
                  Bienvenue{profile?.full_name ? `, ${profile.full_name}` : ""}
                </h1>
                <p className="mt-1 text-sm text-white/80">
                  Voici un aperçu de vos chantiers aujourd&apos;hui.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/dashboard/notifications"
                  aria-label="Notifications"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
                >
                  <BellIcon className="h-5 w-5" />
                </Link>
                {organization && (
                  <Modal triggerLabel="Nouveau chantier" title="Nouveau chantier" variant="banner">
                    <CreateProjectForm organizationId={organization.id} />
                  </Modal>
                )}
              </div>
            </div>
          </div>

          <div className="relative z-10 -mt-8 px-1">
            {organization ? (
              <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-start gap-2">
                    <div>
                      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
                        {ORGANIZATION_TYPE_LABELS[organization.type] ?? organization.type}
                      </p>
                      <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-50">
                        {organization.name}
                      </p>
                    </div>
                    {canEditOrganization && (
                      <Modal
                        triggerLabel="Modifier l'organisation"
                        triggerIcon={<EditIcon className="h-4 w-4" />}
                        title="Modifier l'organisation"
                        variant="icon"
                        iconOnly
                      >
                        <EditOrganizationForm
                          defaultValues={{
                            organizationId: organization.id,
                            name: organization.name,
                            address: organization.address ?? undefined,
                            phone: organization.phone ?? undefined,
                            email: organization.email ?? undefined,
                          }}
                        />
                      </Modal>
                    )}
                  </div>
                  <dl className="flex gap-8 text-sm">
                    <div>
                      <dt className="text-slate-500 dark:text-slate-400">Votre rôle</dt>
                      <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">
                        {membership?.role}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500 dark:text-slate-400">Membres</dt>
                      <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">
                        {memberCount ?? 1}
                      </dd>
                    </div>
                  </dl>
                </div>
                {(organization.address || organization.phone || organization.email) && (
                  <dl className="flex flex-wrap gap-x-8 gap-y-2 border-t border-slate-100 pt-3 text-sm dark:border-slate-800">
                    {organization.address && (
                      <div>
                        <dt className="text-slate-500 dark:text-slate-400">Adresse</dt>
                        <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">
                          {organization.address}
                        </dd>
                      </div>
                    )}
                    {organization.phone && (
                      <div>
                        <dt className="text-slate-500 dark:text-slate-400">Téléphone</dt>
                        <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">
                          {organization.phone}
                        </dd>
                      </div>
                    )}
                    {organization.email && (
                      <div>
                        <dt className="text-slate-500 dark:text-slate-400">Email</dt>
                        <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">
                          {organization.email}
                        </dd>
                      </div>
                    )}
                  </dl>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-start gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {collaboratorProjects.length > 0
                    ? "Aucune organisation à vous — mais vous collaborez sur des chantiers ci-dessous."
                    : "Aucune organisation associée à votre compte pour l'instant."}
                </p>
                <Modal triggerLabel="Créer mon organisation" title="Créer mon organisation">
                  <CreateOrganizationForm />
                </Modal>
              </div>
            )}
          </div>
        </div>

        {collaboratorProjects.length > 0 && (
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
              Chantiers où vous collaborez
            </p>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {collaboratorProjects.map((project) => (
                <li
                  key={project.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-600"
                >
                  <Link href={`/dashboard/projects/${project.id}`} className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {project.name}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {collaboratorOrgNames.get(project.organization_id) ?? "—"} ·{" "}
                      {PROJECT_ROLE_LABELS[collaboratorRoleByProjectId.get(project.id) ?? ""] ??
                        "Membre"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {showTrialBanner && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300">
            {trialDaysRemaining > 0 ? (
              <>
                Votre essai gratuit se termine dans {trialDaysRemaining} jour
                {trialDaysRemaining > 1 ? "s" : ""}.{" "}
              </>
            ) : (
              <>Votre essai gratuit est terminé. </>
            )}
            <Link href="/dashboard/billing" className="font-medium underline">
              Passer à l&apos;abonnement payant
            </Link>
          </div>
        )}

        {organization && isAgencyView && (
          <AgencyDashboard
            organizationId={organization.id}
            canEditProjects={canEditProjects}
            canDeleteProjects={canDeleteProjects}
          />
        )}

        {organization && !isAgencyView && (
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
              Mes projets
            </p>

            {projectSummaries.length > 0 ? (
              <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {projectSummaries.map((project) => {
                  const minorUnit = minorUnitFor(project.currency_code);
                  const spentPercent =
                    project.budget_minor > 0
                      ? Math.round((project.spent / project.budget_minor) * 100)
                      : 0;
                  return (
                    <li
                      key={project.id}
                      className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-600"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {project.name}
                        </span>
                        <div className="flex shrink-0 items-center gap-1">
                          {project.toReviewCount > 0 && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                              {project.toReviewCount} à vérifier
                            </span>
                          )}
                          <ProjectActionsMenu
                            projectId={project.id}
                            projectName={project.name}
                            currencyCode={project.currency_code}
                            editDefaults={{
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
                            canEdit={canEditProjects}
                            canDelete={canDeleteProjects}
                          />
                        </div>
                      </div>

                      <Link
                        href={`/dashboard/projects/${project.id}`}
                        className="flex flex-1 flex-col"
                      >
                        <div className="mt-4 flex items-center gap-4">
                          <DonutChart
                            size={64}
                            strokeWidth={7}
                            total={100}
                            segments={[
                              {
                                value: Math.min(spentPercent, 100),
                                colorClassName: "text-brand-600 dark:text-brand-500",
                              },
                            ]}
                            centerLabel={`${spentPercent}%`}
                          />
                          <dl className="grid flex-1 grid-cols-1 gap-y-1.5 text-xs">
                            <div className="flex items-center justify-between">
                              <dt className="text-slate-500 dark:text-slate-400">Budget</dt>
                              <dd className="text-slate-900 dark:text-slate-100">
                                {formatMoney(project.budget_minor, project.currency_code, minorUnit)}
                              </dd>
                            </div>
                            <div className="flex items-center justify-between">
                              <dt className="text-slate-500 dark:text-slate-400">Financé</dt>
                              <dd className="text-slate-900 dark:text-slate-100">
                                {formatMoney(project.funded, project.currency_code, minorUnit)}
                              </dd>
                            </div>
                            <div className="flex items-center justify-between">
                              <dt className="text-slate-500 dark:text-slate-400">Dépensé</dt>
                              <dd className="text-slate-900 dark:text-slate-100">
                                {formatMoney(project.spent, project.currency_code, minorUnit)}
                              </dd>
                            </div>
                          </dl>
                        </div>

                        <div className="mt-4">
                          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                            <span>Avancement chantier</span>
                            <span>{project.progressPercent}%</span>
                          </div>
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            <div
                              className="h-full rounded-full bg-brand-600 dark:bg-brand-500"
                              style={{ width: `${project.progressPercent}%` }}
                            />
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Aucun chantier créé.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
