"use client";

import { useEffect } from "react";
import { REDUCED_MOTION_KEY, THEME_MODE_KEY } from "@/lib/theme";

// Mounted once in the root layout. The blocking init script (see
// layout.tsx) resolves the theme once before paint; this keeps "Auto" (and
// the reduced-motion default, while the user hasn't overridden it) in sync
// afterwards if the OS setting changes while the tab stays open.
export function ThemeWatcher() {
  useEffect(() => {
    const colorScheme = window.matchMedia("(prefers-color-scheme: dark)");
    const applyIfAuto = () => {
      const mode = localStorage.getItem(THEME_MODE_KEY) || "auto";
      if (mode === "auto") {
        document.documentElement.classList.toggle("dark", colorScheme.matches);
      }
    };
    colorScheme.addEventListener("change", applyIfAuto);

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const applyIfMotionUnset = () => {
      if (localStorage.getItem(REDUCED_MOTION_KEY) === null) {
        document.documentElement.setAttribute("data-reduced-motion", String(reducedMotion.matches));
      }
    };
    reducedMotion.addEventListener("change", applyIfMotionUnset);

    return () => {
      colorScheme.removeEventListener("change", applyIfAuto);
      reducedMotion.removeEventListener("change", applyIfMotionUnset);
    };
  }, []);

  return null;
}
