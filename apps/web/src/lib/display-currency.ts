// Personal display-currency preference — purely cosmetic, scoped to this
// browser (plain localStorage, same reasoning as lib/theme.ts). Never
// changes what's actually stored or billed: project/expense/funding
// records keep their own native currency, and subscription billing stays
// whatever Stripe actually charges (see @keurflow/business's
// getBillingCurrency) — this only controls how amounts are *displayed*.
export const DISPLAY_CURRENCY_KEY = "keurflow-display-currency";

// "native" (the default) shows each amount in its own currency, unchanged
// from before this preference existed. The other four are the only
// currencies @keurflow/business's convertDisplayAmountMinor knows how to
// convert between.
export const DISPLAY_CURRENCY_OPTIONS = [
  { value: "native", label: "Automatique (devise d'origine)" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "XOF", label: "XOF — Franc CFA (BCEAO)" },
  { value: "XAF", label: "XAF — Franc CFA (BEAC)" },
  { value: "USD", label: "USD — Dollar américain" },
] as const;

export type DisplayCurrency = (typeof DISPLAY_CURRENCY_OPTIONS)[number]["value"];

const DISPLAY_CURRENCY_VALUES = new Set(DISPLAY_CURRENCY_OPTIONS.map((o) => o.value));

function isDisplayCurrency(value: string | null): value is DisplayCurrency {
  return !!value && DISPLAY_CURRENCY_VALUES.has(value as DisplayCurrency);
}

// null outside the browser (SSR) or before the first client read, so every
// <Money> instance starts by rendering the native currency it was given —
// no server/client mismatch, no need for a blocking init script the way
// theme mode needs one (a brief flash of the native currency before
// hydration is a much smaller cost than a light/dark flash).
export function getStoredDisplayCurrency(): DisplayCurrency | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(DISPLAY_CURRENCY_KEY);
  return isDisplayCurrency(stored) ? stored : "native";
}

const CHANGE_EVENT = "keurflow:display-currency-change";

// Every <Money>/<MoneyBarChart> instance on the page listens for this so
// changing the preference in the sidebar updates them all immediately,
// without a full page reload. A plain window CustomEvent rather than React
// context — this app has no existing client-side provider tree to hook
// into (the theme system uses the same direct-DOM-plus-localStorage
// approach), and every consumer already needs its own useEffect to read
// localStorage on mount regardless.
export function setStoredDisplayCurrency(value: DisplayCurrency) {
  localStorage.setItem(DISPLAY_CURRENCY_KEY, value);
  window.dispatchEvent(new CustomEvent<DisplayCurrency>(CHANGE_EVENT, { detail: value }));
}

export function onDisplayCurrencyChange(callback: (value: DisplayCurrency) => void): () => void {
  function handler(event: Event) {
    callback((event as CustomEvent<DisplayCurrency>).detail);
  }
  window.addEventListener(CHANGE_EVENT, handler);
  return () => window.removeEventListener(CHANGE_EVENT, handler);
}
