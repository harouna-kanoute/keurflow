// Appearance preferences (mode/accent/font) are cosmetic-only and scoped to
// this browser — no account sync, no migration needed — so plain
// localStorage is enough; keys are shared between the blocking init script
// below and the settings UI so they can never drift apart.
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

export const TEXT_SIZE_OPTIONS: { value: TextSize; label: string }[] = [
  { value: "small", label: "Petit" },
  { value: "medium", label: "Moyen" },
  { value: "large", label: "Grand" },
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

export function setTextSizeAttr(size: TextSize) {
  document.documentElement.setAttribute("data-text-size", size);
}

// No stored value yet means "never asked" here, distinct from "explicitly
// off" — so first read falls back to the OS accessibility setting rather
// than a hardcoded false, same spirit as mode's "auto".
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function setReducedMotionAttr(enabled: boolean) {
  document.documentElement.setAttribute("data-reduced-motion", String(enabled));
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
    var textSize = localStorage.getItem(${JSON.stringify(TEXT_SIZE_KEY)}) || "medium";
    var storedMotion = localStorage.getItem(${JSON.stringify(REDUCED_MOTION_KEY)});
    var reducedMotion = storedMotion === null
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : storedMotion === "true";
    var isDark = mode === "dark" || (mode === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    var root = document.documentElement;
    root.classList.toggle("dark", isDark);
    root.setAttribute("data-accent", accent);
    root.setAttribute("data-font", font);
    root.setAttribute("data-text-size", textSize);
    root.setAttribute("data-reduced-motion", String(reducedMotion));
  } catch (e) {}
})();
`;
