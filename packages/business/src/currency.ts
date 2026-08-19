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

// The four currencies KeurFlow ever actively converts between — either for
// billing (EUR + the two CFA zones) or for the personal display-currency
// preference (adds USD on top). A closed lookup rather than a currencies
// table round-trip, since the display preference must also work client-side
// (localStorage), where a DB call isn't an option. Other project currencies
// (GNF, MRU, CDF...) stay usable for fundings/expenses but are never a
// conversion target — see convertDisplayAmountMinor.
const CURRENCY_MINOR_UNITS: Record<string, number> = {
  EUR: 2,
  USD: 2,
  XOF: 0,
  XAF: 0,
};

export function getCurrencyMinorUnit(currencyCode: string): number {
  return CURRENCY_MINOR_UNITS[currencyCode] ?? 2;
}

// Manually maintained approximate rate — not a live FX feed. Only used for
// the personal display-currency preference (never for billing, which always
// charges whatever currency was actually shown at checkout — see
// getBillingCurrency/convertEurMinorToCfa, which stay independent of this).
export const EUR_TO_USD_RATE = 1.08;

// Every rate here expressed against EUR, the pivot currency for converting
// between any two of the four. 1 / EUR_TO_CFA_RATE converts XOF/XAF back to
// EUR; multiplying by another currency's own EUR rate then converts onward.
const CURRENCY_TO_EUR_RATE: Record<string, number> = {
  EUR: 1,
  XOF: 1 / EUR_TO_CFA_RATE,
  XAF: 1 / EUR_TO_CFA_RATE,
  USD: 1 / EUR_TO_USD_RATE,
};

// Converts a minor-unit amount from one currency to another via EUR as the
// pivot, for the personal display-currency preference only — never for
// billing. Returns null (not a same-value fallback) when either currency
// isn't one of the four this app converts between, so callers combining
// several amounts (e.g. summing a multi-currency total) can tell a partial,
// silently-wrong conversion apart from a real one and fall back accordingly.
export function convertDisplayAmountMinor(
  amountMinor: number,
  fromCurrency: string,
  toCurrency: string,
): number | null {
  if (fromCurrency === toCurrency) return amountMinor;
  const fromRate = CURRENCY_TO_EUR_RATE[fromCurrency];
  const toRate = CURRENCY_TO_EUR_RATE[toCurrency];
  if (!fromRate || !toRate) return null;

  const fromMajor = amountMinor / 10 ** getCurrencyMinorUnit(fromCurrency);
  const eurMajor = fromMajor * fromRate;
  const toMajor = eurMajor / toRate;
  return Math.round(toMajor * 10 ** getCurrencyMinorUnit(toCurrency));
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
