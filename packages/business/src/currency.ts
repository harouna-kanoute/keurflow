// XOF and XAF (both CFA franc zones) are pegged to the euro at a fixed rate
// via a currency board arrangement — 1 EUR = 655.957 F CFA, unlike a
// floating-rate currency. Billing prices in F CFA can therefore be derived
// from the canonical EUR price stored in `plans` with simple multiplication:
// no FX API, no rate to keep fresh, no drift to reconcile — the same
// "derive, don't store twice" pattern as getAnnualPriceMinor.
export const EUR_TO_CFA_RATE = 655.957;

// The only two currencies billing can charge in beyond EUR. GNF/MRU/CDF stay
// usable as *project* currencies (fundings/expenses) but aren't billing
// options — they float against the euro, so a fixed-rate conversion like
// this one wouldn't be accurate for them.
const CFA_CURRENCIES = new Set(["XOF", "XAF"]);

export function isCfaCurrency(currencyCode: string): boolean {
  return CFA_CURRENCIES.has(currencyCode);
}

// eurPriceMinor is EUR cents (2 decimals). XOF/XAF have 0 decimals, so the
// result is already a whole-franc amount in the target currency's own minor
// unit — no further scaling needed.
export function convertEurMinorToCfa(eurPriceMinor: number): number {
  return Math.round((eurPriceMinor / 100) * EUR_TO_CFA_RATE);
}

// EUR has 2 decimal places; both CFA zones have 0. Billing only ever charges
// in one of these three, so this is a closed lookup rather than a currencies
// table round-trip.
export function getBillingCurrencyMinorUnit(currencyCode: string): number {
  return isCfaCurrency(currencyCode) ? 0 : 2;
}

// The currency an organization is billed in: its own country's currency if
// that's a CFA zone, EUR otherwise. Individual accounts always stay EUR —
// they're typically the diaspora member paying from abroad, not the local
// business; only agencies/companies actually based in a CFA-zone country
// bill locally.
export function getBillingCurrency(
  organizationType: string,
  countryCurrencyCode: string | null,
): string {
  if (organizationType === "individual") return "EUR";
  if (countryCurrencyCode && isCfaCurrency(countryCurrencyCode)) return countryCurrencyCode;
  return "EUR";
}
