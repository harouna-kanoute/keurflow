import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { hasOrgRoleAtLeast } from "@keurflow/business";
import type { OrganizationRole } from "@keurflow/types";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Journal d'activité — KeurFlow" };

const ACTION_LABELS: Record<string, string> = {
  project_created: "Chantier créé",
  member_invited: "Membre invité",
  expense_created: "Dépense ajoutée",
  expense_updated: "Dépense mise à jour",
  expense_approved: "Dépense approuvée",
  expense_rejected: "Dépense rejetée",
  document_uploaded: "Document ajouté",
  photo_uploaded: "Photo ajoutée",
  funding_created: "Financement enregistré",
  milestone_updated: "Étape mise à jour",
  comment_created: "Commentaire ajouté",
  report_created: "Rapport généré",
};

export default async function AuditLogPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!membership || !hasOrgRoleAtLeast(membership.role as OrganizationRole, "admin")) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-canvas px-6 py-24 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Seuls les propriétaires et administrateurs peuvent consulter le journal d&apos;activité.
        </p>
        <Link href="/dashboard" className="text-sm underline">
          Retour
        </Link>
      </div>
    );
  }

  // RLS (audit_logs_select_org_admins) is the authoritative check — this
  // query would return nothing for a non-admin regardless of the gate above.
  const { data: entries } = await supabase
    .from("audit_logs")
    .select("id, action, entity_type, user_id, metadata, created_at")
    .eq("organization_id", membership.organization_id)
    .order("created_at", { ascending: false })
    .limit(100);

  const userIds = [...new Set((entries ?? []).map((e) => e.user_id).filter((id): id is string => !!id))];
  const { data: profiles } =
    userIds.length > 0
      ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
      : { data: [] };
  const userNames = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? "Utilisateur"]));

  return (
    <div className="flex flex-1 flex-col items-center bg-canvas px-6 py-16">
      <div className="w-full max-w-lg">
        <Link
          href="/dashboard"
          className="text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        >
          ← Retour
        </Link>

        <h1 className="mt-4 text-2xl font-semibold text-slate-900 dark:text-slate-50">
          Journal d&apos;activité
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Les 100 dernières actions de votre organisation.
        </p>

        {entries && entries.length > 0 ? (
          <ul className="mt-6 flex flex-col gap-2">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {ACTION_LABELS[entry.action] ?? entry.action}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {new Date(entry.created_at).toLocaleString("fr-FR")}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {entry.user_id ? (userNames.get(entry.user_id) ?? "Utilisateur") : "Système"}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">Aucune activité pour le moment.</p>
        )}
      </div>
    </div>
  );
}
