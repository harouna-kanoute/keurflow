"use client";

import { useTransition } from "react";
import { updateProjectStatus } from "./actions";

const STATUS_OPTIONS = [
  { value: "planning", label: "Planification" },
  { value: "active", label: "Actif" },
  { value: "paused", label: "En pause" },
  { value: "completed", label: "Terminé" },
  { value: "archived", label: "Archivé" },
] as const;

export const PROJECT_STATUS_COLORS: Record<string, string> = {
  planning: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  active: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  paused: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  completed: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  archived: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500",
};

export function ProjectStatusSelect({
  projectId,
  status,
}: {
  projectId: string;
  status: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      defaultValue={status}
      disabled={isPending}
      onChange={(e) => {
        const nextStatus = e.target.value as (typeof STATUS_OPTIONS)[number]["value"];
        startTransition(async () => {
          await updateProjectStatus({ projectId, status: nextStatus });
        });
      }}
      className={`rounded-full border-0 py-1 pr-7 pl-3 text-xs font-medium outline-none disabled:opacity-50 ${
        PROJECT_STATUS_COLORS[status] ?? PROJECT_STATUS_COLORS.planning
      }`}
    >
      {STATUS_OPTIONS.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
