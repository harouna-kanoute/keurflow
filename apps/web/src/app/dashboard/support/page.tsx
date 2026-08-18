import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SupportIcon } from "@/components/icons";
import { CreateSupportTicketForm } from "./create-support-ticket-form";
import { TicketAttachments } from "./ticket-attachments";

export const metadata: Metadata = { title: "Support — KeurFlow" };

const CATEGORY_LABELS: Record<string, string> = {
  bug: "Bug",
  security: "Faille de sécurité",
  other: "Autre",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Ouvert",
  in_progress: "En cours",
  resolved: "Résolu",
  closed: "Fermé",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  resolved: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  closed: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

export default async function SupportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  const { data: tickets } = await supabase
    .from("support_tickets")
    .select("id, category, subject, description, status, attachment_paths, created_at")
    .order("created_at", { ascending: false });

  // One batch signed-url call across every ticket's attachments rather than
  // one per ticket — same approach as the project photo gallery.
  const allPaths = (tickets ?? []).flatMap((t) => t.attachment_paths ?? []);
  const { data: signedUrls } =
    allPaths.length > 0
      ? await supabase.storage.from("support-attachments").createSignedUrls(allPaths, 3600)
      : { data: [] };
  const signedUrlByPath = new Map(
    (signedUrls ?? []).map((s) => [s.path, s.signedUrl] as const),
  );

  return (
    <div className="flex flex-1 flex-col bg-canvas px-6 py-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-semibold text-slate-900 dark:text-slate-50">
            <SupportIcon className="h-6 w-6 text-brand-600 dark:text-brand-500" />
            Support
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Un bug, une faille de sécurité ou tout autre problème ? Décrivez-le ci-dessous, nous
            l&apos;examinerons dès que possible.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <CreateSupportTicketForm
            userId={user.id}
            organizationId={membership?.organization_id ?? null}
          />
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
          <strong className="font-medium">Faille de sécurité ?</strong> Merci de ne pas la
          divulguer publiquement (réseaux sociaux, forums…) tant qu&apos;elle n&apos;a pas été
          corrigée — décrivez-la ici, en évitant d&apos;inclure des données personnelles d&apos;un
          autre utilisateur.
        </div>

        <div>
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
            Mes signalements
          </p>
          {tickets && tickets.length > 0 ? (
            <ul className="mt-3 flex flex-col gap-2">
              {tickets.map((ticket) => (
                <li
                  key={ticket.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {ticket.subject}
                    </span>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        {CATEGORY_LABELS[ticket.category] ?? ticket.category}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[ticket.status] ?? ""}`}
                      >
                        {STATUS_LABELS[ticket.status] ?? ticket.status}
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-slate-600 dark:text-slate-400">{ticket.description}</p>
                  <TicketAttachments
                    ticketId={ticket.id}
                    attachments={(ticket.attachment_paths ?? []).map((path: string) => ({
                      path,
                      url: signedUrlByPath.get(path) ?? null,
                    }))}
                  />
                  <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                    {new Date(ticket.created_at).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              Aucun signalement pour le moment.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
