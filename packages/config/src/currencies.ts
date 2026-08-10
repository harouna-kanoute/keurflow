import type { Currency } from "@keurflow/types";

// minorUnit = number of decimal digits (0 for zero-decimal currencies like XOF/XAF/GNF).
// All monetary amounts elsewhere in the codebase are stored/passed as integers
// in the currency's minor unit — see @keurflow/business/money for conversions.
export const CURRENCIES: readonly Omit<Currency, "id">[] = [
  { code: "EUR", name: "Euro", symbol: "€", minorUnit: 2, active: true },
  { code: "XOF", name: "Franc CFA (BCEAO)", symbol: "F CFA", minorUnit: 0, active: true },
  { code: "XAF", name: "Franc CFA (BEAC)", symbol: "F CFA", minorUnit: 0, active: true },
  { code: "GNF", name: "Franc guinéen", symbol: "FG", minorUnit: 0, active: true },
  { code: "MRU", name: "Ouguiya mauritanien", symbol: "UM", minorUnit: 2, active: true },
  { code: "CDF", name: "Franc congolais", symbol: "FC", minorUnit: 2, active: true },
  { code: "CVE", name: "Escudo cap-verdien", symbol: "$", minorUnit: 2, active: false },
  { code: "USD", name: "Dollar américain", symbol: "$", minorUnit: 2, active: true },
  { code: "GBP", name: "Livre sterling", symbol: "£", minorUnit: 2, active: true },
  { code: "CAD", name: "Dollar canadien", symbol: "$", minorUnit: 2, active: true },
] as const;
