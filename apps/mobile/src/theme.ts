// Minimal shared palette — mirrors the web app's zinc/black look (apps/web
// Tailwind classes) without pulling in a styling library.
export const colors = {
  background: "#fafafa",
  card: "#ffffff",
  border: "#e4e4e7",
  borderStrong: "#a1a1aa",
  text: "#09090b",
  textMuted: "#71717a",
  primary: "#09090b",
  primaryText: "#fafafa",
  danger: "#dc2626",
  dangerBg: "#fef2f2",
  amber: "#92400e",
  amberBg: "#fef3c7",
} as const;
