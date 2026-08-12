// Appearance preferences (mode/accent/font) are cosmetic-only and scoped to
// this browser — no account sync, no migration needed — so plain
// localStorage is enough; keys are shared between the blocking init script
// below and the settings UI so they can never drift apart.
export const THEME_MODE_KEY = "keurflow-theme-mode";
export const ACCENT_KEY = "keurflow-accent";
export const FONT_KEY = "keurflow-font";

export type ThemeMode = "light" | "dark" | "auto";
export type Accent = "brand" | "violet" | "teal" | "blue";
export type FontChoice = "modern" | "classic" | "system";

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

export function isDarkResolved(mode: string | null): boolean {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

// Three independent setters rather than one combined applyTheme(mode, accent,
// font) — each only ever touches its own attribute on <html>. A combined
// setter would need the other two current values from React state, which
// can be stale if a click fires before the previous one's setState has
// re-rendered (React batches same-tick updates); reading/writing DOM
// attributes directly has no such race.
export function setModeAttr(mode: ThemeMode) {
  document.documentElement.classList.toggle("dark", isDarkResolved(mode));
}

export function setAccentAttr(accent: Accent) {
  document.documentElement.setAttribute("data-accent", accent);
}

export function setFontAttr(font: FontChoice) {
  document.documentElement.setAttribute("data-font", font);
}

// Inlined into <head> as a blocking script (see layout.tsx) so the correct
// theme/accent/font apply before first paint — otherwise the page would
// flash the defaults and then jump to the stored preference.
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var mode = localStorage.getItem(${JSON.stringify(THEME_MODE_KEY)}) || "auto";
    var accent = localStorage.getItem(${JSON.stringify(ACCENT_KEY)}) || "brand";
    var font = localStorage.getItem(${JSON.stringify(FONT_KEY)}) || "modern";
    var isDark = mode === "dark" || (mode === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    var root = document.documentElement;
    root.classList.toggle("dark", isDark);
    root.setAttribute("data-accent", accent);
    root.setAttribute("data-font", font);
  } catch (e) {}
})();
`;
