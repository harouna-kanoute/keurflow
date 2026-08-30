import { Text } from "react-native";
import type { FontChoice } from "./preferences";

// React Native has no CSS-cascade equivalent for "one font for the whole
// app" — every <Text> needs its own fontFamily, and this codebase has
// dozens of screens with ad-hoc inline text styles, not all routed through
// theme.typography. Rewriting every one of them is out of proportion to
// this feature, so instead this patches RN's own Text.render (the same
// technique react-native-global-props uses) to inject the right font
// automatically, based on whatever fontWeight that Text's own style already
// asked for — a real per-instance choice, not one hardcoded family for
// every weight (which would make "bold" headings and "regular" body text
// render from the same font file, i.e. visually identical weight).
const GEIST_BY_WEIGHT: Record<string, string> = {
  "100": "Geist_100Thin",
  "200": "Geist_200ExtraLight",
  "300": "Geist_300Light",
  "400": "Geist_400Regular",
  normal: "Geist_400Regular",
  "500": "Geist_500Medium",
  "600": "Geist_600SemiBold",
  "700": "Geist_700Bold",
  bold: "Geist_700Bold",
  "800": "Geist_800ExtraBold",
  "900": "Geist_900Black",
};

// Lora only ships 4 weights — anything else falls back to the nearest one
// available rather than a missing font (which RN silently renders as the
// OS default, defeating the whole point of choosing "Classique").
const LORA_BY_WEIGHT: Record<string, string> = {
  "100": "Lora_400Regular",
  "200": "Lora_400Regular",
  "300": "Lora_400Regular",
  "400": "Lora_400Regular",
  normal: "Lora_400Regular",
  "500": "Lora_500Medium",
  "600": "Lora_600SemiBold",
  "700": "Lora_700Bold",
  bold: "Lora_700Bold",
  "800": "Lora_700Bold",
  "900": "Lora_700Bold",
};

function familyForWeight(font: FontChoice, weight: string): string | undefined {
  if (font === "system") return undefined;
  const table = font === "modern" ? GEIST_BY_WEIGHT : LORA_BY_WEIGHT;
  return table[weight] ?? table["400"];
}

function flattenStyle(style: unknown): Record<string, unknown> {
  if (!style) return {};
  if (Array.isArray(style)) {
    return (style as unknown[]).reduce<Record<string, unknown>>(
      (acc, s) => Object.assign(acc, flattenStyle(s)),
      {},
    );
  }
  return style as Record<string, unknown>;
}

let currentFont: FontChoice = "modern";
let patched = false;

export function setGlobalFont(font: FontChoice) {
  currentFont = font;
  if (patched) return;
  patched = true;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const TextAny = Text as any;
  const originalRender = TextAny.render;
  TextAny.render = function patchedRender(...args: unknown[]) {
    const origin = originalRender.apply(this, args);
    const flat = flattenStyle(origin.props.style);
    const weight = String(flat.fontWeight ?? "400");
    const family = familyForWeight(currentFont, weight);
    // An explicit fontFamily already set by the component wins (e.g. an
    // icon font) — this only fills in the gap for plain text.
    if (!family || flat.fontFamily) return origin;
    // Returning a plain merged object here, not [origin.props.style, {...}] —
    // react-native-web's nested-Text ("<Text> inside another <Text>", e.g.
    // Money rendered as a StatLine's value) takes a lower-level DOM path
    // that doesn't run a raw style array through StyleSheet.flatten first,
    // and ends up trying to assign the array's own numeric keys ("0", "1")
    // as CSS properties directly — "Failed to set an indexed property [0]
    // on CSSStyleDeclaration". flat is already the fully-merged object from
    // above, so this is a safe, real object either way.
    return {
      ...origin,
      props: { ...origin.props, style: { ...flat, fontFamily: family } },
    };
  };
}
