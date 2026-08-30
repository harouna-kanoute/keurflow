import AsyncStorage from "@react-native-async-storage/async-storage";

// Direct port of apps/web/src/lib/display-currency.ts — purely a display
// preference (never changes what's actually stored or billed). AsyncStorage
// instead of localStorage; no CustomEvent bus to reproduce since the React
// Context in display-currency-context.tsx already re-renders every consumer
// on change.
export const DISPLAY_CURRENCY_KEY = "keurflow-display-currency";

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

export async function getStoredDisplayCurrency(): Promise<DisplayCurrency> {
  const stored = await AsyncStorage.getItem(DISPLAY_CURRENCY_KEY);
  return isDisplayCurrency(stored) ? stored : "native";
}

export async function setStoredDisplayCurrency(value: DisplayCurrency): Promise<void> {
  await AsyncStorage.setItem(DISPLAY_CURRENCY_KEY, value);
}
