import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { formatMoney, getFundingCoveragePercent, getFundingGap, getTotalFunded } from "@keurflow/business";
import { CURRENCIES } from "@keurflow/config";
import { createClient } from "@/lib/supabase/server";
import { CreateFundingForm } from "./create-funding-form";

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
    .select("id, name, project_type, city, status, budget_minor, currency_code")
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
      </div>
    </div>
  );
}
