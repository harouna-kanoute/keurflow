"use client";

import { useEffect, useState } from "react";
import { convertDisplayAmountMinor, formatMoney, getCurrencyMinorUnit } from "@keurflow/business";
import {
  getStoredDisplayCurrency,
  onDisplayCurrencyChange,
  type DisplayCurrency,
} from "@/lib/display-currency";

// Drop-in replacement for a plain {formatMoney(amountMinor, currencyCode,
// minorUnit)} call — renders in the user's preferred display currency when
// one is set and convertible, otherwise falls back to the amount's own
// native currency (including for currencies this app doesn't know how to
// convert, e.g. GNF/MRU/CDF — see convertDisplayAmountMinor). Purely
// cosmetic: never affects what's actually stored.
export function Money({
  amountMinor,
  currencyCode,
  minorUnit,
}: {
  amountMinor: number;
  currencyCode: string;
  minorUnit: number;
}) {
  // Starts null so server-rendered markup and the first client render match
  // (no hydration mismatch) — briefly shows the native currency until this
  // effect reads localStorage, same trade-off lib/display-currency.ts notes.
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency | null>(null);

  useEffect(() => {
    // One-time sync from localStorage (an external store, not React state)
    // on mount — same documented exception as AppearanceSettings.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDisplayCurrency(getStoredDisplayCurrency());
    return onDisplayCurrencyChange(setDisplayCurrency);
  }, []);

  if (!displayCurrency || displayCurrency === "native") {
    return <>{formatMoney(amountMinor, currencyCode, minorUnit)}</>;
  }

  const converted = convertDisplayAmountMinor(amountMinor, currencyCode, displayCurrency);
  if (converted === null) {
    return <>{formatMoney(amountMinor, currencyCode, minorUnit)}</>;
  }

  return <>{formatMoney(converted, displayCurrency, getCurrencyMinorUnit(displayCurrency))}</>;
}
