// Same brand ramp as the web app (apps/web/src/app/globals.css --color-brand-*)
// so the two apps are visually identical, not just similar.
const brand = {
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
  brand: typeof brand;
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
  unreadBg: string;
  overlayOnPrimary: string;
};

export const lightColors: ThemeColors = {
  brand,
  background: "#f8fafc",
  card: "#ffffff",
  border: "#e2e8f0",
  borderStrong: "#94a3b8",
  text: "#0f172a",
  textMuted: "#64748b",
  primary: brand[600],
  primaryText: "#ffffff",
  danger: "#dc2626",
  dangerBg: "#fef2f2",
  amber: "#92400e",
  amberBg: "#fef3c7",
  unreadBg: brand[50],
  overlayOnPrimary: "rgba(255,255,255,0.16)",
};

export const darkColors: ThemeColors = {
  brand,
  background: "#08090d",
  card: "#12141c",
  border: "#1e293b",
  borderStrong: "#475569",
  text: "#f1f5f9",
  textMuted: "#94a3b8",
  primary: brand[500],
  primaryText: "#ffffff",
  danger: "#f87171",
  dangerBg: "rgba(127,29,29,0.35)",
  amber: "#fcd34d",
  amberBg: "rgba(120,53,15,0.4)",
  unreadBg: "rgba(108,92,217,0.16)",
  overlayOnPrimary: "rgba(255,255,255,0.16)",
};
