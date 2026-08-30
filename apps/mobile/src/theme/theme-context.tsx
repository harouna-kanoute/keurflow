import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { ACCENT_RAMPS } from "./accents";
import { BRAND_RAMP, buildColors, type ThemeColors } from "./colors";
import { setGlobalFont } from "./global-font";
import {
  ACCENT_KEY,
  FONT_KEY,
  REDUCED_MOTION_KEY,
  TEXT_SIZE_KEY,
  TEXT_SIZE_OPTIONS,
  THEME_MODE_KEY,
  type Accent,
  type FontChoice,
  type TextSize,
  type ThemeMode,
} from "./preferences";
import { radius, shadow, spacing, buildTypography } from "./tokens";

export type Theme = {
  scheme: "light" | "dark";
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: ReturnType<typeof buildTypography>;
  shadow: typeof shadow;
  reducedMotion: boolean;
  mode: ThemeMode;
  accent: Accent;
  font: FontChoice;
  textSize: TextSize;
  setMode: (mode: ThemeMode) => void;
  setAccent: (accent: Accent) => void;
  setFont: (font: FontChoice) => void;
  setTextSize: (size: TextSize) => void;
  setReducedMotion: (enabled: boolean) => void;
};

const ThemeContext = createContext<Theme | null>(null);

function ramp(accent: Accent) {
  return accent === "brand" ? BRAND_RAMP : ACCENT_RAMPS[accent];
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const osScheme = useColorScheme() === "dark" ? "dark" : "light";
  const [mode, setModeState] = useState<ThemeMode>("auto");
  const [accent, setAccentState] = useState<Accent>("brand");
  const [font, setFontState] = useState<FontChoice>("modern");
  const [textSize, setTextSizeState] = useState<TextSize>("medium");
  const [reducedMotion, setReducedMotionState] = useState(false);

  useEffect(() => {
    (async () => {
      const [storedMode, storedAccent, storedFont, storedTextSize, storedReducedMotion] = await Promise.all([
        AsyncStorage.getItem(THEME_MODE_KEY),
        AsyncStorage.getItem(ACCENT_KEY),
        AsyncStorage.getItem(FONT_KEY),
        AsyncStorage.getItem(TEXT_SIZE_KEY),
        AsyncStorage.getItem(REDUCED_MOTION_KEY),
      ]);
      if (storedMode) setModeState(storedMode as ThemeMode);
      if (storedAccent) setAccentState(storedAccent as Accent);
      if (storedFont) setFontState(storedFont as FontChoice);
      if (storedTextSize) setTextSizeState(storedTextSize as TextSize);
      if (storedReducedMotion) setReducedMotionState(storedReducedMotion === "true");
    })();
  }, []);

  // Applied as soon as the preference is known (including the very first
  // render, before AsyncStorage resolves) — setGlobalFont no-ops once
  // already patched, it just updates which family patchedRender picks.
  useEffect(() => {
    setGlobalFont(font);
  }, [font]);

  const scheme = mode === "auto" ? osScheme : mode;

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(THEME_MODE_KEY, next);
  };
  const setAccent = (next: Accent) => {
    setAccentState(next);
    AsyncStorage.setItem(ACCENT_KEY, next);
  };
  const setFont = (next: FontChoice) => {
    setFontState(next);
    AsyncStorage.setItem(FONT_KEY, next);
  };
  const setTextSize = (next: TextSize) => {
    setTextSizeState(next);
    AsyncStorage.setItem(TEXT_SIZE_KEY, next);
  };
  const setReducedMotion = (next: boolean) => {
    setReducedMotionState(next);
    AsyncStorage.setItem(REDUCED_MOTION_KEY, String(next));
  };

  const value = useMemo<Theme>(() => {
    const colors = buildColors(ramp(accent))[scheme];
    const scale = TEXT_SIZE_OPTIONS.find((o) => o.value === textSize)?.scale ?? 1;
    return {
      scheme,
      colors,
      spacing,
      radius,
      typography: buildTypography(scale),
      shadow,
      reducedMotion,
      mode,
      accent,
      font,
      textSize,
      setMode,
      setAccent,
      setFont,
      setTextSize,
      setReducedMotion,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheme, accent, textSize, reducedMotion, mode, font]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
