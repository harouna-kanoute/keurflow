"use client";

import { useEffect, useState } from "react";
import { convertDisplayAmountMinor, formatCompactMoney, getCurrencyMinorUnit } from "@keurflow/business";
import {
  getStoredDisplayCurrency,
  onDisplayCurrencyChange,
  type DisplayCurrency,
} from "@/lib/display-currency";
import { BarChart } from "@/components/bar-chart";

// Wraps BarChart with the display-currency preference: converts every bar's
// value and updates the "(CURRENCY)" heading together, so they never show
// mismatched currencies. BarChart itself stays a plain presentational
// component — only this wrapper needs to be a client island.
export function MoneyBarChart({
  title,
  data,
  currencyCode,
  minorUnit,
}: {
  title: string;
  data: { label: string; amountMinor: number }[];
  currencyCode: string;
  minorUnit: number;
}) {
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency | null>(null);

  useEffect(() => {
    // One-time sync from localStorage (an external store, not React state)
    // on mount — same documented exception as AppearanceSettings.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDisplayCurrency(getStoredDisplayCurrency());
    return onDisplayCurrencyChange(setDisplayCurrency);
  }, []);

  // Whole chart shares one native currency, so a single probe conversion
  // (0 always converts cleanly when the pair is known) tells us up front
  // whether every bar can convert — no per-bar null-checking needed.
  const wantsConversion = !!displayCurrency && displayCurrency !== "native";
  const canConvert = wantsConversion && convertDisplayAmountMinor(0, currencyCode, displayCurrency) !== null;

  const effectiveCurrency = canConvert ? (displayCurrency as DisplayCurrency) : currencyCode;
  const effectiveMinorUnit = canConvert ? getCurrencyMinorUnit(effectiveCurrency) : minorUnit;
  const chartData = data.map((d) => ({
    label: d.label,
    value: canConvert
      ? (convertDisplayAmountMinor(d.amountMinor, currencyCode, displayCurrency as DisplayCurrency) ?? d.amountMinor)
      : d.amountMinor,
  }));

  return (
    <div>
      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
        {title} ({effectiveCurrency})
      </p>
      <div className="mt-4">
        <BarChart data={chartData} formatValue={(v) => formatCompactMoney(v, effectiveMinorUnit)} />
      </div>
    </div>
  );
}
