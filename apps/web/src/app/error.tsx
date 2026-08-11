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
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-zinc-50 px-6 py-24 text-center dark:bg-black">
      <p className="text-sm font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
        KeurFlow
      </p>
      <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
        Une erreur est survenue
      </h1>
      <p className="max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
        Veuillez réessayer. Si le problème persiste, revenez à l&apos;accueil.
      </p>
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="flex h-10 items-center justify-center rounded-full bg-black px-5 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          Réessayer
        </button>
        <a
          href="/dashboard"
          className="flex h-10 items-center justify-center rounded-full border border-zinc-300 px-5 text-sm font-medium text-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
        >
          Accueil
        </a>
      </div>
    </div>
  );
}
