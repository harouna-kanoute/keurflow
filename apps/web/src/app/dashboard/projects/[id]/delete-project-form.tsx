"use client";

import { useState, useTransition } from "react";
import { deleteProject } from "./actions";

export function DeleteProjectForm({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");

  const canConfirm = confirmText.trim() === projectName;

  return (
    <div className="flex flex-col gap-4 text-left">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Cette action est irréversible. Elle supprime définitivement le chantier{" "}
        <strong className="text-slate-900 dark:text-slate-100">{projectName}</strong>, ainsi que
        tous ses financements, dépenses, documents, photos, étapes, membres et rapports.
      </p>
      <div>
        <label
          htmlFor="deleteConfirm"
          className="text-sm text-slate-600 dark:text-slate-400"
        >
          Tapez <strong className="text-slate-900 dark:text-slate-100">{projectName}</strong> pour
          confirmer
        </label>
        <input
          id="deleteConfirm"
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="button"
        disabled={!canConfirm || isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await deleteProject({ projectId });
            if (result?.error) setError(result.error);
          })
        }
        className="flex h-10 items-center justify-center rounded-full bg-red-600 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50 dark:bg-red-700 dark:hover:bg-red-800"
      >
        {isPending ? "Suppression…" : "Supprimer définitivement"}
      </button>
    </div>
  );
}
