"use client";

import { useEffect, useState } from "react";
import {
  DISPLAY_CURRENCY_OPTIONS,
  getStoredDisplayCurrency,
  setStoredDisplayCurrency,
  type DisplayCurrency,
} from "@/lib/display-currency";

function optionButtonClass(active: boolean): string {
  return `rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
    active
      ? "border-brand-600 bg-brand-50 text-brand-700 dark:border-brand-500 dark:bg-brand-900 dark:text-brand-300"
      : "border-slate-300 text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600"
  }`;
}

// Purely a display preference — never changes what's actually stored or
// billed (see lib/display-currency.ts). Lives alongside AppearanceSettings
// in the sidebar's "Paramètres" modal since both are personal,
// browser-scoped preferences with no account sync.
export function CurrencySettings() {
  const [currency, setCurrency] = useState<DisplayCurrency>("native");

  useEffect(() => {
    // One-time sync from localStorage (an external store, not React state)
    // on mount — same documented exception as AppearanceSettings.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrency(getStoredDisplayCurrency() ?? "native");
  }, []);

  const updateCurrency = (next: DisplayCurrency) => {
    setCurrency(next);
    setStoredDisplayCurrency(next);
  };

  return (
    <div>
      <p className="text-sm font-medium text-slate-900 dark:text-slate-50">Devise d&apos;affichage</p>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
        Convertit les montants affichés (tableau de bord, rapports, dépenses, abonnement) pour la
        lecture — ne modifie rien d&apos;enregistré.
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {DISPLAY_CURRENCY_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => updateCurrency(option.value)}
            className={optionButtonClass(currency === option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
