"use client";

import Link from "next/link";
import { useState } from "react";

// Sits as an absolutely-positioned sibling of the dashboard's <main> content
// (which must be `relative` for this to size correctly) — it never touches
// the content itself, just intercepts clicks over it. A click shows a small
// dismissible hint instead of immediately navigating away, since jumping the
// user straight to billing on their first accidental click would be jarring.
export function SubscriptionLockOverlay() {
  const [showHint, setShowHint] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Chantiers verrouillés — abonnement requis"
        onClick={() => setShowHint(true)}
        className="absolute inset-0 z-10 cursor-not-allowed bg-transparent"
      />
      {showHint && (
        <div className="fixed right-4 bottom-4 left-4 z-30 flex flex-col gap-2 rounded-xl border border-amber-200 bg-white p-4 shadow-lg sm:right-6 sm:left-auto sm:w-80 dark:border-amber-900/40 dark:bg-slate-900">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Vos chantiers sont en lecture seule tant que l&apos;essai n&apos;est pas relayé par un
            abonnement.
          </p>
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setShowHint(false)}
              className="text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            >
              Fermer
            </button>
            <Link
              href="/dashboard/billing"
              className="rounded-full bg-brand-600 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600"
            >
              S&apos;abonner
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
