import { redirect } from "next/navigation";
import { formatMoney } from "@keurflow/business";
import { CURRENCIES } from "@keurflow/config";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../(auth)/actions";
import { CreateOrganizationForm } from "./create-organization-form";
import { CreateProjectForm } from "./create-project-form";

function minorUnitFor(currencyCode: string): number {
  return CURRENCIES.find((c) => c.code === currencyCode)?.minorUnit ?? 2;
}

const ORGANIZATION_TYPE_LABELS: Record<string, string> = {
  individual: "Particulier",
  agency: "Agence immobilière",
  company: "Entreprise",
};

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

  // RLS (projects_select_org_or_project_members) filters this to projects
  // this user can actually see — filtering by organization_id here is just
  // for clarity, not the security boundary itself.
  const { data: projects } = organization
    ? await supabase
        .from("projects")
        .select("id, name, status, budget_minor, currency_code")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false })
    : { data: null };

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 px-6 py-24 text-center dark:bg-black">
      <div>
        <p className="text-sm font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
          KeurFlow
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-black dark:text-zinc-50">
          Bienvenue{profile?.full_name ? `, ${profile.full_name}` : ""}
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{user.email}</p>
      </div>

      {organization ? (
        <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 text-left shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            {ORGANIZATION_TYPE_LABELS[organization.type] ?? organization.type}
          </p>
          <p className="mt-1 text-lg font-semibold text-black dark:text-zinc-50">
            {organization.name}
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-zinc-500 dark:text-zinc-400">Votre rôle</dt>
            <dd className="text-right text-zinc-900 dark:text-zinc-100">{membership?.role}</dd>
            <dt className="text-zinc-500 dark:text-zinc-400">Membres</dt>
            <dd className="text-right text-zinc-900 dark:text-zinc-100">{memberCount ?? 1}</dd>
          </dl>
        </div>
      ) : (
        <div className="flex w-full max-w-sm flex-col items-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Aucune organisation associée à votre compte pour l&apos;instant.
          </p>
          <CreateOrganizationForm />
        </div>
      )}

      {organization && (
        <div className="w-full max-w-sm text-left">
          <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            Chantiers
          </p>
          {projects && projects.length > 0 ? (
            <ul className="mt-2 flex flex-col gap-2">
              {projects.map((project) => (
                <li
                  key={project.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <span className="text-zinc-900 dark:text-zinc-100">{project.name}</span>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {formatMoney(
                      project.budget_minor,
                      project.currency_code,
                      minorUnitFor(project.currency_code),
                    )}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Aucun chantier créé.</p>
          )}
          <CreateProjectForm organizationId={organization.id} />
        </div>
      )}

      <p className="max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
        Le tableau de bord des chantiers complet arrive en Phase 10 — pour l&apos;instant, cette
        page confirme que l&apos;authentification et la structure multi-tenant fonctionnent de bout
        en bout.
      </p>
      <form action={signOut}>
        <button
          type="submit"
          className="flex h-10 items-center justify-center rounded-full border border-zinc-300 px-5 text-sm font-medium text-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
        >
          Se déconnecter
        </button>
      </form>
    </div>
  );
}
