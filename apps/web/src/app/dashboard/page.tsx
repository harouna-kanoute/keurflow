import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../(auth)/actions";

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
        <p className="max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
          Aucune organisation associée à votre compte pour l&apos;instant.
        </p>
      )}

      <p className="max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
        Le tableau de bord des chantiers arrive en Phase 10 — pour l&apos;instant, cette page
        confirme que l&apos;authentification et la structure multi-tenant fonctionnent de bout en
        bout.
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
