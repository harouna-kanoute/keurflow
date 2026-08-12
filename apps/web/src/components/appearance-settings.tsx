"use client";

import { useEffect, useState } from "react";
import {
  ACCENT_KEY,
  ACCENT_OPTIONS,
  FONT_KEY,
  FONT_OPTIONS,
  MODE_OPTIONS,
  setAccentAttr,
  setFontAttr,
  setModeAttr,
  THEME_MODE_KEY,
  type Accent,
  type FontChoice,
  type ThemeMode,
} from "@/lib/theme";

function optionButtonClass(active: boolean): string {
  return `rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
    active
      ? "border-clay-600 bg-clay-50 text-clay-700 dark:border-clay-500 dark:bg-clay-900 dark:text-clay-300"
      : "border-stone-300 text-stone-700 hover:border-stone-400 dark:border-stone-700 dark:text-stone-300 dark:hover:border-stone-600"
  }`;
}

export function AppearanceSettings() {
  // Read once on mount, client-only — localStorage isn't available during
  // server rendering and the blocking init script has already applied the
  // real values to <html> before this component ever paints.
  const [mode, setMode] = useState<ThemeMode>("auto");
  const [accent, setAccent] = useState<Accent>("clay");
  const [font, setFont] = useState<FontChoice>("modern");

  useEffect(() => {
    // One-time sync from localStorage (an external store, not React state) on
    // mount, not a response to a prop/state change — the documented exception
    // to "don't setState in an effect": this dialog starts closed, so the
    // extra render before the first paint the user actually sees is free.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode((localStorage.getItem(THEME_MODE_KEY) as ThemeMode) || "auto");
    setAccent((localStorage.getItem(ACCENT_KEY) as Accent) || "clay");
    setFont((localStorage.getItem(FONT_KEY) as FontChoice) || "modern");
  }, []);

  const updateMode = (next: ThemeMode) => {
    setMode(next);
    localStorage.setItem(THEME_MODE_KEY, next);
    setModeAttr(next);
  };

  const updateAccent = (next: Accent) => {
    setAccent(next);
    localStorage.setItem(ACCENT_KEY, next);
    setAccentAttr(next);
  };

  const updateFont = (next: FontChoice) => {
    setFont(next);
    localStorage.setItem(FONT_KEY, next);
    setFontAttr(next);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm font-medium text-stone-900 dark:text-stone-50">Mode</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {MODE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => updateMode(option.value)}
              className={optionButtonClass(mode === option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-stone-900 dark:text-stone-50">Couleur d&apos;accent</p>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {ACCENT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => updateAccent(option.value)}
              aria-label={option.label}
              aria-pressed={accent === option.value}
              className={`flex flex-col items-center gap-1.5 rounded-lg border p-2 transition-colors ${
                accent === option.value
                  ? "border-stone-900 dark:border-stone-100"
                  : "border-transparent hover:border-stone-300 dark:hover:border-stone-700"
              }`}
            >
              <span
                className="h-6 w-6 rounded-full"
                style={{ backgroundColor: option.swatch }}
                aria-hidden
              />
              <span className="text-xs text-stone-600 dark:text-stone-400">{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-stone-900 dark:text-stone-50">Police</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {FONT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => updateFont(option.value)}
              className={optionButtonClass(font === option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
