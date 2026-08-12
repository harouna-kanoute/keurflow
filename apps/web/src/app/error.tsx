"use client";

import { useEffect } from "react";

// Generic message per §68 — the real error is logged, never shown to the user.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[error boundary]", error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-canvas px-6 py-24 text-center">
      <p className="text-sm font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
        KeurFlow
      </p>
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
        Une erreur est survenue
      </h1>
      <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
        Veuillez réessayer. Si le problème persiste, revenez à l&apos;accueil.
      </p>
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="flex h-10 items-center justify-center rounded-full bg-brand-600 px-5 text-sm font-medium text-white hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600"
        >
          Réessayer
        </button>
        <a
          href="/dashboard"
          className="flex h-10 items-center justify-center rounded-full border border-slate-300 px-5 text-sm font-medium text-slate-900 dark:border-slate-700 dark:text-slate-100"
        >
          Accueil
        </a>
      </div>
    </div>
  );
}
