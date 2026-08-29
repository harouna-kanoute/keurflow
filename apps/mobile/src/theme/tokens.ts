// Theme-independent tokens — spacing/radius/typography/shadow scale shared by
// both light and dark mode. Mirrors the web app's conventions (rounded-2xl
// cards, rounded-full pills, shadow-sm + a 1px border, no heavier shadow
// level anywhere) rather than inventing a new visual language for mobile.
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 999,
} as const;

export const typography = {
  hero: { fontSize: 30, fontWeight: "700", lineHeight: 36 },
  title: { fontSize: 22, fontWeight: "700", lineHeight: 28 },
  subtitle: { fontSize: 16, fontWeight: "500", lineHeight: 22 },
  body: { fontSize: 15, fontWeight: "400", lineHeight: 21 },
  label: { fontSize: 13, fontWeight: "500", lineHeight: 18 },
  caption: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
} as const;

export const shadow = {
  card: {
    shadowColor: "#000000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
} as const;
