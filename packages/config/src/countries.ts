import type { Country } from "@keurflow/types";

// Reference data used to seed the `countries` table (Phase 4) and as static
// fallback for labels/flags in the UI. At runtime the `countries` table in
// Postgres is the source of truth — new countries are added there, not here,
// so activating a new market never requires a redeploy.
export const COUNTRIES: readonly Omit<Country, "id">[] = [
  { code: "SN", name: "Sénégal", currencyCode: "XOF", active: true },
  { code: "CI", name: "Côte d'Ivoire", currencyCode: "XOF", active: true },
  { code: "ML", name: "Mali", currencyCode: "XOF", active: true },
  { code: "GN", name: "Guinée", currencyCode: "GNF", active: true },
  { code: "MR", name: "Mauritanie", currencyCode: "MRU", active: true },
  { code: "BF", name: "Burkina Faso", currencyCode: "XOF", active: true },
  { code: "NE", name: "Niger", currencyCode: "XOF", active: true },
  { code: "BJ", name: "Bénin", currencyCode: "XOF", active: true },
  { code: "TG", name: "Togo", currencyCode: "XOF", active: true },
  { code: "CM", name: "Cameroun", currencyCode: "XAF", active: true },
  { code: "GA", name: "Gabon", currencyCode: "XAF", active: true },
  { code: "CG", name: "Congo", currencyCode: "XAF", active: true },
  { code: "CD", name: "RDC", currencyCode: "CDF", active: true },
  { code: "CV", name: "Cap-Vert", currencyCode: "CVE", active: false },
] as const;

// Regional indicator symbols: each ISO 3166-1 alpha-2 letter maps to
// U+1F1E6 + (letter offset from 'A') — no flag image assets needed.
export function countryCodeToFlagEmoji(code: string): string {
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((char) => 0x1f1e6 + (char.charCodeAt(0) - 65)),
  );
}
