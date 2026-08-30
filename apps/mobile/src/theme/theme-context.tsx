import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { darkColors, lightColors, type ThemeColors } from "./colors";
import { radius, shadow, spacing, typography } from "./tokens";

export type Theme = {
  scheme: "light" | "dark";
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  shadow: typeof shadow;
};

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Driven purely by the OS setting (app.json's userInterfaceStyle must be
  // "automatic" for this to ever report "dark") — no in-app toggle.
  const scheme = useColorScheme() === "dark" ? "dark" : "light";

  const value = useMemo<Theme>(
    () => ({
      scheme,
      colors: scheme === "dark" ? darkColors : lightColors,
      spacing,
      radius,
      typography,
      shadow,
    }),
    [scheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
