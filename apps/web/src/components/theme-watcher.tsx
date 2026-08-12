"use client";

import { useEffect } from "react";
import { THEME_MODE_KEY } from "@/lib/theme";

// Mounted once in the root layout. The blocking init script (see
// layout.tsx) resolves the theme once before paint; this keeps "Auto" in
// sync afterwards if the OS scheme changes while the tab stays open.
export function ThemeWatcher() {
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const applyIfAuto = () => {
      const mode = localStorage.getItem(THEME_MODE_KEY) || "auto";
      if (mode === "auto") {
        document.documentElement.classList.toggle("dark", media.matches);
      }
    };

    media.addEventListener("change", applyIfAuto);
    return () => media.removeEventListener("change", applyIfAuto);
  }, []);

  return null;
}
