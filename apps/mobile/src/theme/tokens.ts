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

// Scales fontSize/lineHeight together rather than each text-* style
// individually — mirrors web's own approach (globals.css scales
// --text-size-root, one rem base, instead of touching every Tailwind size
// class). scale=1 is "Moyen", the default.
export function buildTypography(scale: number) {
  return {
    hero: { fontSize: Math.round(30 * scale), fontWeight: "700" as const, lineHeight: Math.round(36 * scale) },
    title: { fontSize: Math.round(22 * scale), fontWeight: "700" as const, lineHeight: Math.round(28 * scale) },
    subtitle: { fontSize: Math.round(16 * scale), fontWeight: "500" as const, lineHeight: Math.round(22 * scale) },
    body: { fontSize: Math.round(15 * scale), fontWeight: "400" as const, lineHeight: Math.round(21 * scale) },
    label: { fontSize: Math.round(13 * scale), fontWeight: "500" as const, lineHeight: Math.round(18 * scale) },
    caption: {
      fontSize: Math.round(11 * scale),
      fontWeight: "600" as const,
      letterSpacing: 0.5,
      textTransform: "uppercase" as const,
    },
  };
}

export const typography = buildTypography(1);

export const shadow = {
  card: {
    shadowColor: "#000000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
} as const;
