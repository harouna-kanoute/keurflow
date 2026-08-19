// All money handling is integer-only, in the currency's minor unit, to avoid
// float rounding errors — critical here because XOF/XAF/GNF have 0 decimals
// while EUR/USD have 2, and a project can mix currencies across fundings.

export function toMinorUnits(amount: number, minorUnit: number): number {
  return Math.round(amount * 10 ** minorUnit);
}

export function fromMajorUnits(amountMinor: number, minorUnit: number): number {
  return amountMinor / 10 ** minorUnit;
}

export interface CurrencyAmount {
  amountMinor: number;
  currencyCode: string;
}

// Never sum raw amounts across different currencies — an agency's projects
// can each be in a different one, and cross-currency conversion is out of
// MVP scope (§100). Returns one total per currency actually present.
export function sumByCurrency(amounts: readonly CurrencyAmount[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const { amountMinor, currencyCode } of amounts) {
    totals[currencyCode] = (totals[currencyCode] ?? 0) + amountMinor;
  }
  return totals;
}

export function formatMoney(
  amountMinor: number,
  currencyCode: string,
  minorUnit: number,
  locale = "fr-FR",
): string {
  const major = fromMajorUnits(amountMinor, minorUnit);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: minorUnit,
    maximumFractionDigits: minorUnit,
  }).format(major);
}

// Abbreviated form without a currency symbol (e.g. "53,6k") — for chart
// axis/bar labels, where the currency is already stated once in a shared
// heading rather than repeated on every value.
export function formatCompactMoney(
  amountMinor: number,
  minorUnit: number,
  locale = "fr-FR",
): string {
  const major = fromMajorUnits(amountMinor, minorUnit);
  return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(major);
}
