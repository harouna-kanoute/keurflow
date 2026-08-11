import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  formatMoney,
  getApprovedExpensesTotal,
  getMilestoneProgressPercent,
  getTotalFunded,
  getTrialDaysRemaining,
  isBillablePlan,
} from "@keurflow/business";
import { CURRENCIES } from "@keurflow/config";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../(auth)/actions";
import { CreateOrganizationForm } from "./create-organization-form";
import { CreateProjectForm } from "./create-project-form";
import { AgencyDashboard } from "./agency-dashboard";

function minorUnitFor(currencyCode: string): number {
  return CURRENCIES.find((c) => c.code === currencyCode)?.minorUnit ?? 2;
}

const ORGANIZATION_TYPE_LABELS: Record<string, string> = {
  individual: "Particulier",
  agency: "Agence immobilière",
  company: "Entreprise",
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

  const { count: unreadNotificationCount } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null);

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
        .select("id, name, type")
        .eq("id", membership.organization_id)
        .single()
    : { data: null };

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

  // RLS (projects_select_org_or_project_members) filters this to projects
  // this user can actually see — filtering by organization_id here is just
  // for clarity, not the security boundary itself.
  const { data: projects } = organization && !isAgencyView
    ? await supabase
        .from("projects")
        .select("id, name, status, budget_minor, currency_code")
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

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-cream px-6 py-24 text-center dark:bg-stone-950">
      <div>
        <p className="text-sm font-medium tracking-wide text-stone-500 uppercase dark:text-stone-400">
          KeurFlow
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-stone-900 dark:text-stone-50">
          Bienvenue{profile?.full_name ? `, ${profile.full_name}` : ""}
        </h1>
        <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">{user.email}</p>
        <Link
          href="/dashboard/notifications"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-stone-700 hover:text-stone-900 dark:text-stone-300 dark:hover:text-stone-100"
        >
          Notifications
          {!!unreadNotificationCount && (
            <span className="rounded-full bg-clay-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-clay-700 dark:bg-clay-500 dark:hover:bg-clay-600">
              {unreadNotificationCount}
            </span>
          )}
        </Link>
        <Link
          href="/dashboard/billing"
          className="mt-1 inline-block text-sm text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
        >
          Abonnement
        </Link>
        {organization && (
          <Link
            href="/dashboard/audit-log"
            className="mt-1 inline-block text-sm text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
          >
            Journal d&apos;activité
          </Link>
        )}
      </div>

      {showTrialBanner && (
        <div className="w-full max-w-sm rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300">
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

      {organization ? (
        <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-6 text-left shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <p className="text-xs font-medium tracking-wide text-stone-500 uppercase dark:text-stone-400">
            {ORGANIZATION_TYPE_LABELS[organization.type] ?? organization.type}
          </p>
          <p className="mt-1 text-lg font-semibold text-stone-900 dark:text-stone-50">
            {organization.name}
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-stone-500 dark:text-stone-400">Votre rôle</dt>
            <dd className="text-right text-stone-900 dark:text-stone-100">{membership?.role}</dd>
            <dt className="text-stone-500 dark:text-stone-400">Membres</dt>
            <dd className="text-right text-stone-900 dark:text-stone-100">{memberCount ?? 1}</dd>
          </dl>
        </div>
      ) : (
        <div className="flex w-full max-w-sm flex-col items-center">
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Aucune organisation associée à votre compte pour l&apos;instant.
          </p>
          <CreateOrganizationForm />
        </div>
      )}

      {organization && isAgencyView && (
        <>
          <AgencyDashboard organizationId={organization.id} />
          <div className="w-full max-w-md text-left">
            <CreateProjectForm organizationId={organization.id} />
          </div>
        </>
      )}

      {organization && !isAgencyView && (
        <div className="w-full max-w-md text-left">
          <p className="text-xs font-medium tracking-wide text-stone-500 uppercase dark:text-stone-400">
            Mes projets
          </p>
          {projectSummaries.length > 0 ? (
            <ul className="mt-2 flex flex-col gap-3">
              {projectSummaries.map((project) => {
                const minorUnit = minorUnitFor(project.currency_code);
                return (
                  <li key={project.id}>
                    <Link
                      href={`/dashboard/projects/${project.id}`}
                      className="block rounded-xl border border-stone-200 bg-white px-4 py-3 hover:border-stone-400 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-600"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-stone-900 dark:text-stone-100">
                          {project.name}
                        </span>
                        {project.toReviewCount > 0 && (
                          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                            {project.toReviewCount} à vérifier
                          </span>
                        )}
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
                        <div
                          className="h-full rounded-full bg-clay-600 dark:bg-clay-500"
                          style={{ width: `${project.progressPercent}%` }}
                        />
                      </div>
                      <dl className="mt-2 grid grid-cols-3 gap-x-2 text-xs">
                        <div>
                          <dt className="text-stone-500 dark:text-stone-400">Budget</dt>
                          <dd className="text-stone-900 dark:text-stone-100">
                            {formatMoney(project.budget_minor, project.currency_code, minorUnit)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-stone-500 dark:text-stone-400">Financé</dt>
                          <dd className="text-stone-900 dark:text-stone-100">
                            {formatMoney(project.funded, project.currency_code, minorUnit)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-stone-500 dark:text-stone-400">Dépensé</dt>
                          <dd className="text-stone-900 dark:text-stone-100">
                            {formatMoney(project.spent, project.currency_code, minorUnit)}
                          </dd>
                        </div>
                      </dl>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">Aucun chantier créé.</p>
          )}
          <CreateProjectForm organizationId={organization.id} />
        </div>
      )}

      <form action={signOut}>
        <button
          type="submit"
          className="flex h-10 items-center justify-center rounded-full border border-stone-300 px-5 text-sm font-medium text-stone-900 dark:border-stone-700 dark:text-stone-100"
        >
          Se déconnecter
        </button>
      </form>
    </div>
  );
}
