// Direct port of apps/web/src/lib/theme.ts's constants — same 5 keys, same 4
// preference types, same option lists (French labels) — AsyncStorage instead
// of localStorage, no blocking init script needed (mobile has no SSR/first-
// paint flash to avoid the way web does).
export const THEME_MODE_KEY = "keurflow-theme-mode";
export const ACCENT_KEY = "keurflow-accent";
export const FONT_KEY = "keurflow-font";
export const TEXT_SIZE_KEY = "keurflow-text-size";
export const REDUCED_MOTION_KEY = "keurflow-reduced-motion";

export type ThemeMode = "light" | "dark" | "auto";
export type Accent = "brand" | "violet" | "teal" | "blue";
export type FontChoice = "modern" | "classic" | "system";
export type TextSize = "small" | "medium" | "large";

export const MODE_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: "light", label: "Clair" },
  { value: "dark", label: "Sombre" },
  { value: "auto", label: "Auto" },
];

export const ACCENT_OPTIONS: { value: Accent; label: string; swatch: string }[] = [
  { value: "brand", label: "Indigo", swatch: "#5443c4" },
  { value: "violet", label: "Violet", swatch: "#7141b8" },
  { value: "teal", label: "Sarcelle", swatch: "#1f6f62" },
  { value: "blue", label: "Bleu", swatch: "#2a508a" },
];

export const FONT_OPTIONS: { value: FontChoice; label: string }[] = [
  { value: "modern", label: "Moderne" },
  { value: "classic", label: "Classique" },
  { value: "system", label: "Système" },
];

export const TEXT_SIZE_OPTIONS: { value: TextSize; label: string; scale: number }[] = [
  { value: "small", label: "Petit", scale: 0.9375 },
  { value: "medium", label: "Moyen", scale: 1 },
  { value: "large", label: "Grand", scale: 1.125 },
];
