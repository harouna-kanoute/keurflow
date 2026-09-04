import { useEffect } from "react";
import { type DimensionValue } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { useTheme } from "../theme";

// A single pulsing rectangle — compose a few of these to sketch the shape of
// whatever's loading (mirrors the actual layout instead of a generic
// centered spinner, so the screen doesn't "jump" once real content arrives).
export function Skeleton({
  width = "100%",
  height = 14,
  radius,
  style,
}: {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: object;
}) {
  const theme = useTheme();
  const opacity = useSharedValue(theme.reducedMotion ? 0.6 : 0.4);

  useEffect(() => {
    if (theme.reducedMotion) return;
    opacity.value = withRepeat(withTiming(0.9, { duration: 700 }), -1, true);
  }, [opacity, theme.reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius ?? theme.radius.sm,
          backgroundColor: theme.colors.border,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}
