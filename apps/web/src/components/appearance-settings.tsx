"use client";

import { useEffect, useState } from "react";
import {
  ACCENT_KEY,
  ACCENT_OPTIONS,
  FONT_KEY,
  FONT_OPTIONS,
  MODE_OPTIONS,
  prefersReducedMotion,
  REDUCED_MOTION_KEY,
  setAccentAttr,
  setFontAttr,
  setModeAttr,
  setReducedMotionAttr,
  setTextSizeAttr,
  TEXT_SIZE_KEY,
  TEXT_SIZE_OPTIONS,
  THEME_MODE_KEY,
  type Accent,
  type FontChoice,
  type TextSize,
  type ThemeMode,
} from "@/lib/theme";

function optionButtonClass(active: boolean): string {
  return `rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
    active
      ? "border-brand-600 bg-brand-50 text-brand-700 dark:border-brand-500 dark:bg-brand-900 dark:text-brand-300"
      : "border-slate-300 text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600"
  }`;
}

export function AppearanceSettings() {
  // Read once on mount, client-only — localStorage isn't available during
  // server rendering and the blocking init script has already applied the
  // real values to <html> before this component ever paints.
  const [mode, setMode] = useState<ThemeMode>("auto");
  const [accent, setAccent] = useState<Accent>("brand");
  const [font, setFont] = useState<FontChoice>("modern");
  const [textSize, setTextSize] = useState<TextSize>("medium");
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    // One-time sync from localStorage (an external store, not React state) on
    // mount, not a response to a prop/state change — the documented exception
    // to "don't setState in an effect": this dialog starts closed, so the
    // extra render before the first paint the user actually sees is free.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode((localStorage.getItem(THEME_MODE_KEY) as ThemeMode) || "auto");
    setAccent((localStorage.getItem(ACCENT_KEY) as Accent) || "brand");
    setFont((localStorage.getItem(FONT_KEY) as FontChoice) || "modern");
    setTextSize((localStorage.getItem(TEXT_SIZE_KEY) as TextSize) || "medium");
    const storedMotion = localStorage.getItem(REDUCED_MOTION_KEY);
    setReducedMotion(storedMotion === null ? prefersReducedMotion() : storedMotion === "true");
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

  const updateTextSize = (next: TextSize) => {
    setTextSize(next);
    localStorage.setItem(TEXT_SIZE_KEY, next);
    setTextSizeAttr(next);
  };

  const updateReducedMotion = (next: boolean) => {
    setReducedMotion(next);
    localStorage.setItem(REDUCED_MOTION_KEY, String(next));
    setReducedMotionAttr(next);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm font-medium text-slate-900 dark:text-slate-50">Mode</p>
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
        <p className="text-sm font-medium text-slate-900 dark:text-slate-50">Couleur d&apos;accent</p>
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
                  ? "border-slate-900 dark:border-slate-100"
                  : "border-transparent hover:border-slate-300 dark:hover:border-slate-700"
              }`}
            >
              <span
                className="h-6 w-6 rounded-full"
                style={{ backgroundColor: option.swatch }}
                aria-hidden
              />
              <span className="text-xs text-slate-600 dark:text-slate-400">{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-slate-900 dark:text-slate-50">Police</p>
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

      <div>
        <p className="text-sm font-medium text-slate-900 dark:text-slate-50">Taille du texte</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {TEXT_SIZE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => updateTextSize(option.value)}
              className={optionButtonClass(textSize === option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-slate-50">
            Réduire les animations
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Désactive les transitions de l&apos;interface.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={reducedMotion}
          onClick={() => updateReducedMotion(!reducedMotion)}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
            reducedMotion ? "bg-brand-600 dark:bg-brand-500" : "bg-slate-300 dark:bg-slate-700"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
              reducedMotion ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
