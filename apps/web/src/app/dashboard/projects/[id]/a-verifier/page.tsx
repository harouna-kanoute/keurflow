import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { deriveDocumentationStatus, formatMoney } from "@keurflow/business";
import { CURRENCIES, EXPENSE_CATEGORIES } from "@keurflow/config";
import { createClient } from "@/lib/supabase/server";
import { WhatsAppShareLink } from "@/components/whatsapp-share-link";

function minorUnitFor(currencyCode: string): number {
  return CURRENCIES.find((c) => c.code === currencyCode)?.minorUnit ?? 2;
}

const CATEGORY_LABELS = new Map(EXPENSE_CATEGORIES.map((c) => [c.code, c.label]));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: project } = await supabase.from("projects").select("name").eq("id", id).maybeSingle();
  return { title: project ? `À vérifier — ${project.name} — KeurFlow` : "À vérifier — KeurFlow" };
}

export default async function ToReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS (projects_select_org_or_project_members) returns nothing if this
  // user can't see the project — same as the main project detail page.
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, currency_code")
    .eq("id", id)
    .maybeSingle();
  if (!project) notFound();

  const [{ data: expenses }, { data: documents }, { data: milestones }] = await Promise.all([
    supabase
      .from("expenses")
      .select("id, amount_minor, currency_code, category, supplier_name, expense_date, status")
      .eq("project_id", id)
      .order("expense_date", { ascending: false }),
    supabase.from("documents").select("expense_id").eq("project_id", id).not("expense_id", "is", null),
    supabase.from("milestones").select("id, name, planned_date").eq("project_id", id).eq("status", "delayed"),
  ]);

  const documentCountByExpense = new Map<string, number>();
  for (const doc of documents ?? []) {
    if (!doc.expense_id) continue;
    documentCountByExpense.set(doc.expense_id, (documentCountByExpense.get(doc.expense_id) ?? 0) + 1);
  }

  const minorUnit = minorUnitFor(project.currency_code);
  const pending = (expenses ?? []).filter((e) => e.status === "pending");
  const needsInfo = (expenses ?? []).filter((e) => e.status === "needs_information");
  // "Dépenses sans justificatif" and "documents manquants" (spec §37) are
  // the same underlying signal in this data model — a document always
  // attaches to a specific expense, there's no separate general checklist.
  const missingDocs = (expenses ?? []).filter(
    (e) =>
      e.status !== "rejected" &&
      deriveDocumentationStatus(documentCountByExpense.get(e.id) ?? 0) === "missing",
  );

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const projectUrl = `${appUrl}/dashboard/projects/${project.id}`;

  const isEmpty = pending.length + needsInfo.length + missingDocs.length + (milestones?.length ?? 0) === 0;

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-16 dark:bg-black">
      <div className="w-full max-w-lg">
        <Link
          href={`/dashboard/projects/${project.id}`}
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          ← Retour au chantier
        </Link>

        <h1 className="mt-4 text-2xl font-semibold text-black dark:text-zinc-50">À vérifier</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{project.name}</p>

        {isEmpty && (
          <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">Rien à vérifier pour le moment.</p>
        )}

        {pending.length > 0 && (
          <section className="mt-6">
            <h2 className="text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
              Dépenses à valider ({pending.length})
            </h2>
            <ul className="mt-2 flex flex-col gap-2">
              {pending.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-900/50 dark:bg-amber-900/20"
                >
                  <span className="text-amber-900 dark:text-amber-300">
                    {CATEGORY_LABELS.get(e.category) ?? e.category}
                    {e.supplier_name ? ` · ${e.supplier_name}` : ""} —{" "}
                    {formatMoney(e.amount_minor, e.currency_code, minorUnit)}
                  </span>
                  <WhatsAppShareLink
                    text={`Merci de vérifier la dépense "${CATEGORY_LABELS.get(e.category) ?? e.category}" sur KeurFlow : ${projectUrl}`}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}

        {needsInfo.length > 0 && (
          <section className="mt-6">
            <h2 className="text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
              Demandes d&apos;informations ({needsInfo.length})
            </h2>
            <ul className="mt-2 flex flex-col gap-2">
              {needsInfo.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm dark:border-orange-900/50 dark:bg-orange-900/20"
                >
                  <span className="text-orange-900 dark:text-orange-300">
                    {CATEGORY_LABELS.get(e.category) ?? e.category}
                    {e.supplier_name ? ` · ${e.supplier_name}` : ""} —{" "}
                    {formatMoney(e.amount_minor, e.currency_code, minorUnit)}
                  </span>
                  <WhatsAppShareLink
                    text={`Des informations sont demandées sur la dépense "${CATEGORY_LABELS.get(e.category) ?? e.category}" sur KeurFlow : ${projectUrl}`}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}

        {missingDocs.length > 0 && (
          <section className="mt-6">
            <h2 className="text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
              Dépenses sans justificatif ({missingDocs.length})
            </h2>
            <ul className="mt-2 flex flex-col gap-2">
              {missingDocs.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm dark:border-red-900/50 dark:bg-red-900/20"
                >
                  <span className="text-red-900 dark:text-red-300">
                    {CATEGORY_LABELS.get(e.category) ?? e.category}
                    {e.supplier_name ? ` · ${e.supplier_name}` : ""} —{" "}
                    {formatMoney(e.amount_minor, e.currency_code, minorUnit)}
                  </span>
                  <WhatsAppShareLink
                    text={`Merci d'ajouter un justificatif pour la dépense "${CATEGORY_LABELS.get(e.category) ?? e.category}" sur KeurFlow : ${projectUrl}`}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}

        {milestones && milestones.length > 0 && (
          <section className="mt-6">
            <h2 className="text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
              Étapes en retard ({milestones.length})
            </h2>
            <ul className="mt-2 flex flex-col gap-2">
              {milestones.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm dark:border-red-900/50 dark:bg-red-900/20"
                >
                  <span className="text-red-900 dark:text-red-300">{m.name}</span>
                  <WhatsAppShareLink
                    text={`L'étape "${m.name}" est en retard sur KeurFlow : ${projectUrl}`}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
