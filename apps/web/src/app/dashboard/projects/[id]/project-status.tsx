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
      className="rounded-full border border-slate-300 bg-transparent px-2 py-0.5 text-sm text-slate-500 disabled:opacity-50 dark:border-slate-700 dark:text-slate-400"
    >
      {STATUS_OPTIONS.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
