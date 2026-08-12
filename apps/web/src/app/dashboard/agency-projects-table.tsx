"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatMoney } from "@keurflow/business";
import { CURRENCIES } from "@keurflow/config";
import { DonutChart } from "@/components/donut-chart";
import { ProjectActionsMenu } from "./project-actions-menu";

export interface AgencyProjectRow {
  id: string;
  name: string;
  projectType: string;
  status: string;
  countryName: string;
  budgetMinor: number;
  currencyCode: string;
  address: string | null;
  surfaceArea: number | null;
  spentMinor: number;
  toReviewCount: number;
  missingDocsCount: number;
  delayed: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  planning: "Planification",
  active: "Actif",
  paused: "En pause",
  completed: "Terminé",
  archived: "Archivé",
};

function minorUnitFor(currencyCode: string): number {
  return CURRENCIES.find((c) => c.code === currencyCode)?.minorUnit ?? 2;
}

export function AgencyProjectsTable({
  rows,
  canEditProjects,
  canDeleteProjects,
}: {
  rows: AgencyProjectRow[];
  canEditProjects: boolean;
  canDeleteProjects: boolean;
}) {
  const [countryFilter, setCountryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [delayedOnly, setDelayedOnly] = useState(false);

  const countries = useMemo(
    () => Array.from(new Set(rows.map((r) => r.countryName))).sort(),
    [rows],
  );

  const filtered = rows.filter(
    (r) =>
      (!countryFilter || r.countryName === countryFilter) &&
      (!statusFilter || r.status === statusFilter) &&
      (!delayedOnly || r.delayed),
  );

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={countryFilter}
          onChange={(e) => setCountryFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        >
          <option value="">Tous les pays</option>
          {countries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={delayedOnly}
            onChange={(e) => setDelayedOnly(e.target.checked)}
          />
          En retard uniquement
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Aucun chantier.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {filtered.map((project) => {
            const minorUnit = minorUnitFor(project.currencyCode);
            const spentPercent =
              project.budgetMinor > 0
                ? Math.round((project.spentMinor / project.budgetMinor) * 100)
                : 0;
            return (
              <li
                key={project.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm hover:border-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-600"
              >
                <Link
                  href={`/dashboard/projects/${project.id}`}
                  className="flex flex-1 flex-wrap items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <DonutChart
                      size={36}
                      strokeWidth={4}
                      total={100}
                      segments={[
                        {
                          value: Math.min(spentPercent, 100),
                          colorClassName: "text-brand-600 dark:text-brand-500",
                        },
                      ]}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {project.name}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {project.countryName} · {STATUS_LABELS[project.status] ?? project.status}
                      </span>
                      {project.delayed && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/40 dark:text-red-300">
                          En retard
                        </span>
                      )}
                      {project.toReviewCount > 0 && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                          {project.toReviewCount} à vérifier
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-slate-500 dark:text-slate-400">
                    {formatMoney(project.spentMinor, project.currencyCode, minorUnit)} /{" "}
                    {formatMoney(project.budgetMinor, project.currencyCode, minorUnit)}
                  </span>
                </Link>
                <ProjectActionsMenu
                  projectId={project.id}
                  projectName={project.name}
                  currencyCode={project.currencyCode}
                  editDefaults={{
                    name: project.name,
                    projectType: project.projectType,
                    budgetMinor: project.budgetMinor,
                    address: project.address,
                    surfaceArea: project.surfaceArea,
                  }}
                  canEdit={canEditProjects}
                  canDelete={canDeleteProjects}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
