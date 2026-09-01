import type { Accent } from "./preferences";

// Exact same 4 ramps as apps/web/src/app/globals.css's [data-accent="..."]
// blocks (indigo/"brand" is the default, defined inline in colors.ts).
export type AccentRamp = {
  50: string; 100: string; 200: string; 300: string; 400: string;
  500: string; 600: string; 700: string; 800: string; 900: string;
};

const violet: AccentRamp = {
  50: "#f6f1fc", 100: "#ece3f9", 200: "#d8c8f3", 300: "#bd9fe9", 400: "#a177dd",
  500: "#8a57ce", 600: "#7141b8", 700: "#593293", 800: "#452871", 900: "#341e56",
};

const teal: AccentRamp = {
  50: "#eff9f7", 100: "#d9f0ec", 200: "#b0e0d7", 300: "#7dc9bb", 400: "#4fac9c",
  500: "#2f8d7d", 600: "#1f6f62", 700: "#17564c", 800: "#123f38", 900: "#0d2c27",
};

const blue: AccentRamp = {
  50: "#eff4fb", 100: "#d9e6f6", 200: "#b3cced", 300: "#82abdf", 400: "#5688cc",
  500: "#3968ad", 600: "#2a508a", 700: "#213e6c", 800: "#182c4d", 900: "#101e35",
};

export const ACCENT_RAMPS: Record<Exclude<Accent, "brand">, AccentRamp> = { violet, teal, blue };
