"use client";

import { useEffect, useState } from "react";
import { convertDisplayAmountMinor, formatMoney, getCurrencyMinorUnit } from "@keurflow/business";
import { CURRENCIES } from "@keurflow/config";
import {
  getStoredDisplayCurrency,
  onDisplayCurrencyChange,
  type DisplayCurrency,
} from "@/lib/display-currency";

// A Server Component can't pass a plain function prop to a Client
// Component (not serializable across the RSC boundary), so this is its
// own self-contained lookup rather than a prop — same data source
// agency-dashboard.tsx's own local minorUnitFor uses.
function nativeMinorUnitFor(currencyCode: string): number {
  return CURRENCIES.find((c) => c.code === currencyCode)?.minorUnit ?? 2;
}

// Renders a per-currency total map (e.g. sumByCurrency's output) as either
// a native "X€ + Y F CFA" breakdown (the default, and the fallback if any
// entry's currency can't be converted), or — once a display-currency
// preference is set and every entry is convertible — one combined total,
// which is meaningfully more useful than several native amounts side by
// side for an agency whose projects span multiple countries.
export function MultiCurrencyAmount({ totals }: { totals: Record<string, number> }) {
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency | null>(null);

  useEffect(() => {
    // One-time sync from localStorage (an external store, not React state)
    // on mount — same documented exception as AppearanceSettings.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDisplayCurrency(getStoredDisplayCurrency());
    return onDisplayCurrencyChange(setDisplayCurrency);
  }, []);

  const entries = Object.entries(totals);
  const wantsConversion = !!displayCurrency && displayCurrency !== "native";

  if (entries.length === 0) {
    const currency = wantsConversion ? (displayCurrency as DisplayCurrency) : "EUR";
    return <span>{formatMoney(0, currency, getCurrencyMinorUnit(currency))}</span>;
  }

  if (wantsConversion) {
    const converted = entries.map(([code, amt]) =>
      convertDisplayAmountMinor(amt, code, displayCurrency as DisplayCurrency),
    );
    if (converted.every((v) => v !== null)) {
      const totalMinor = converted.reduce((sum, v) => sum + (v as number), 0);
      return (
        <span>
          {formatMoney(totalMinor, displayCurrency as DisplayCurrency, getCurrencyMinorUnit(displayCurrency as DisplayCurrency))}
        </span>
      );
    }
  }

  return (
    <span>
      {entries
        .map(([currencyCode, amountMinor]) =>
          formatMoney(amountMinor, currencyCode, nativeMinorUnitFor(currencyCode)),
        )
        .join(" + ")}
    </span>
  );
}
