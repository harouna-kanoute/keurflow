import type { AccentRamp } from "./accents";

// Same brand ramp as the web app (apps/web/src/app/globals.css --color-brand-*)
// so the two apps are visually identical, not just similar. This is the
// default ("brand"/indigo) accent — the other 3 ramps live in accents.ts.
export const BRAND_RAMP: AccentRamp = {
  50: "#f2f1fd",
  100: "#e5e3fb",
  200: "#ccc7f7",
  300: "#aaa1f0",
  400: "#8879e6",
  500: "#6c5cd9",
  600: "#5443c4",
  700: "#43359c",
  800: "#362b7a",
  900: "#2a2260",
};

export type ThemeColors = {
  brand: AccentRamp;
  background: string;
  card: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryText: string;
  danger: string;
  dangerBg: string;
  amber: string;
  amberBg: string;
  success: string;
  successBg: string;
  unreadBg: string;
  overlayOnPrimary: string;
};

function hexToRgba(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Builds a full light/dark ThemeColors pair from any accent ramp — the
// default export below just calls this with the indigo ramp, and
// theme-context.tsx calls it again whenever the accent preference changes.
export function buildColors(ramp: AccentRamp): { light: ThemeColors; dark: ThemeColors } {
  return {
    light: {
      brand: ramp,
      background: "#f8fafc",
      card: "#ffffff",
      border: "#e2e8f0",
      borderStrong: "#94a3b8",
      text: "#0f172a",
      textMuted: "#64748b",
      primary: ramp[600],
      primaryText: "#ffffff",
      danger: "#dc2626",
      dangerBg: "#fef2f2",
      amber: "#92400e",
      amberBg: "#fef3c7",
      success: "#15803d",
      successBg: "#dcfce7",
      unreadBg: ramp[50],
      overlayOnPrimary: "rgba(255,255,255,0.16)",
    },
    dark: {
      brand: ramp,
      background: "#08090d",
      card: "#12141c",
      border: "#1e293b",
      borderStrong: "#475569",
      text: "#f1f5f9",
      textMuted: "#94a3b8",
      primary: ramp[500],
      primaryText: "#ffffff",
      danger: "#f87171",
      dangerBg: "rgba(127,29,29,0.35)",
      amber: "#fcd34d",
      amberBg: "rgba(120,53,15,0.4)",
      success: "#4ade80",
      successBg: "rgba(21,128,61,0.3)",
      unreadBg: hexToRgba(ramp[500], 0.16),
      overlayOnPrimary: "rgba(255,255,255,0.16)",
    },
  };
}

export const lightColors: ThemeColors = buildColors(BRAND_RAMP).light;
export const darkColors: ThemeColors = buildColors(BRAND_RAMP).dark;
