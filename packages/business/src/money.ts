// All money handling is integer-only, in the currency's minor unit, to avoid
// float rounding errors — critical here because XOF/XAF/GNF have 0 decimals
// while EUR/USD have 2, and a project can mix currencies across fundings.

export function toMinorUnits(amount: number, minorUnit: number): number {
  return Math.round(amount * 10 ** minorUnit);
}

export function fromMajorUnits(amountMinor: number, minorUnit: number): number {
  return amountMinor / 10 ** minorUnit;
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
