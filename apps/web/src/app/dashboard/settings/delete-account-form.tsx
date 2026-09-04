"use client";

import { useState, useTransition } from "react";
import { deleteAccount } from "./actions";

export function DeleteAccountForm({ email }: { email: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");

  const canConfirm = confirmText.trim().toLowerCase() === email.toLowerCase();

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50/50 p-5 dark:border-red-900/50 dark:bg-red-900/10">
      <p className="text-sm font-medium text-red-900 dark:text-red-300">Supprimer mon compte</p>
      <p className="mt-1 text-sm text-red-700 dark:text-red-400">
        Cette action est irréversible. Elle supprime définitivement votre compte et votre profil. Si
        vous êtes seul·e dans votre organisation, elle sera supprimée avec tous ses chantiers ; sinon
        sa propriété est transférée automatiquement à un autre administrateur ou responsable actif.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1.5">
          <label
            htmlFor="deleteAccountConfirm"
            className="text-sm text-red-700 dark:text-red-400"
          >
            Tapez <strong>{email}</strong> pour confirmer
          </label>
          <input
            id="deleteAccountConfirm"
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="h-10 rounded-lg border border-red-300 px-3 text-sm text-slate-900 dark:border-red-800 dark:bg-slate-950 dark:text-slate-50"
          />
        </div>
        <button
          type="button"
          disabled={!canConfirm || isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await deleteAccount({ confirmEmail: confirmText });
              if (result?.error) setError(result.error);
            })
          }
          className="flex h-10 shrink-0 items-center justify-center rounded-full bg-red-600 px-4 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50 dark:bg-red-700 dark:hover:bg-red-800"
        >
          {isPending ? "Suppression…" : "Supprimer définitivement"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
