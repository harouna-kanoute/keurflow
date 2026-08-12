import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MarkAllReadButton, MarkReadButton } from "./notification-actions";

export const metadata: Metadata = { title: "Notifications — KeurFlow" };

const TYPE_LABELS: Record<string, string> = {
  new_expense: "Nouvelle dépense",
  expense_needs_review: "Informations demandées",
  document_added: "Document ajouté",
  expense_approved: "Dépense approuvée",
  expense_rejected: "Dépense rejetée",
  milestone_completed: "Étape terminée",
  milestone_delayed: "Étape en retard",
  report_created: "Rapport généré",
  member_invited: "Membre invité",
};

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // RLS (notifications_select_own) already scopes this to the caller — the
  // .eq below is just for clarity, not the security boundary.
  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, project_id, type, title, body, read_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const unreadCount = (notifications ?? []).filter((n) => !n.read_at).length;

  return (
    <div className="flex flex-1 flex-col items-center bg-canvas px-6 py-16">
      <div className="w-full max-w-lg">
        <Link
          href="/dashboard"
          className="text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        >
          ← Retour
        </Link>

        <div className="mt-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Notifications</h1>
          {unreadCount > 0 && <MarkAllReadButton />}
        </div>

        {notifications && notifications.length > 0 ? (
          <ul className="mt-6 flex flex-col gap-2">
            {notifications.map((notification) => (
              <li
                key={notification.id}
                className={`rounded-xl border px-4 py-3 text-sm ${
                  notification.read_at
                    ? "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                    : "border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">
                      {notification.title}
                    </p>
                    {notification.body && (
                      <p className="mt-0.5 text-slate-600 dark:text-slate-400">
                        {notification.body}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                      {TYPE_LABELS[notification.type] ?? notification.type}
                      {notification.project_id && (
                        <>
                          {" · "}
                          <Link
                            href={`/dashboard/projects/${notification.project_id}`}
                            className="underline"
                          >
                            Voir le chantier
                          </Link>
                        </>
                      )}
                    </p>
                  </div>
                  {!notification.read_at && <MarkReadButton notificationId={notification.id} />}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
            Aucune notification pour l&apos;instant.
          </p>
        )}
      </div>
    </div>
  );
}
