import { useMemo } from "react";
import { StyleSheet } from "react-native";
import { useTheme, type Theme } from "./theme-context";

// Replaces the old pattern of a module-level `StyleSheet.create({...colors})`,
// which bakes light-mode colors in at import time and can never react to a
// scheme change. Components call this inside the render body instead, and
// only recompute the stylesheet when the theme (i.e. the color scheme)
// actually changes.
export function useStyles<T extends StyleSheet.NamedStyles<T>>(factory: (theme: Theme) => T): T {
  const theme = useTheme();
  return useMemo(() => StyleSheet.create(factory(theme)), [theme]);
}
