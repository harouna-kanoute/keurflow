"use client";

import { useState, useTransition } from "react";
import { verifyEmailOtp } from "../../(auth)/actions";

const TYPE_COPY: Record<string, { title: string; body: string; cta: string }> = {
  invite: {
    title: "Rejoindre le chantier",
    body: "Vous avez été invité·e à collaborer sur un chantier KeurFlow. Confirmez pour continuer.",
    cta: "Accepter l'invitation",
  },
  recovery: {
    title: "Réinitialiser le mot de passe",
    body: "Confirmez pour choisir un nouveau mot de passe.",
    cta: "Confirmer",
  },
  signup: {
    title: "Confirmer votre email",
    body: "Confirmez votre adresse email pour activer votre compte.",
    cta: "Confirmer mon email",
  },
};

const DEFAULT_COPY = {
  title: "Confirmer",
  body: "Cliquez pour continuer.",
  cta: "Confirmer",
};

export function ConfirmForm({
  tokenHash,
  type,
  next,
}: {
  tokenHash: string;
  type: string;
  next?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const copy = TYPE_COPY[type] ?? DEFAULT_COPY;

  return (
    <>
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">{copy.title}</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{copy.body}</p>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await verifyEmailOtp({
              tokenHash,
              type: type as "signup" | "invite" | "magiclink" | "recovery" | "email" | "email_change",
              next,
            });
            if (result?.error) setError(result.error);
          })
        }
        className="mt-6 flex h-11 w-full items-center justify-center rounded-full bg-brand-600 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50 dark:bg-brand-500 dark:hover:bg-brand-600"
      >
        {isPending ? "Vérification…" : copy.cta}
      </button>
    </>
  );
}
