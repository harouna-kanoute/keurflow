import { FadeInDown, FadeInUp } from "react-native-reanimated";

// A plain function, not a hook — every call site needs this inside a
// .map()/renderItem callback over a dynamically-sized list, where calling a
// hook would break React's rules (a changing item count would change the
// number of hook calls within the enclosing component's render). Callers
// read theme.reducedMotion once at their own top level and pass it in.
//
// Returns undefined (no animation) when reducedMotion is true — every
// existing entrance-animated element in this app is a bare Animated.View/
// Animated.Text with its own entering={...} computed inline (list staggers:
// Math.min(index, MAX) * STEP; single elements: a fixed delay), so this is a
// one-line swap at each call site instead of restructuring the tree.
export function entranceAnimation(
  reducedMotion: boolean,
  {
    index,
    delay = 0,
    duration = 300,
    direction = "up",
    maxStaggerIndex = 8,
    stepMs = 50,
  }: {
    // Pass index for a staggered list item; omit it (use delay instead) for
    // a single, non-list element.
    index?: number;
    delay?: number;
    duration?: number;
    direction?: "up" | "down";
    maxStaggerIndex?: number;
    stepMs?: number;
  },
) {
  if (reducedMotion) return undefined;

  const effectiveDelay = index !== undefined ? Math.min(index, maxStaggerIndex) * stepMs : delay;
  const base = direction === "down" ? FadeInDown : FadeInUp;
  return base.delay(effectiveDelay).duration(duration);
}
