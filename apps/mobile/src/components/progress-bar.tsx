import { useEffect } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useTheme } from "../theme";

type Tone = "brand" | "amber" | "danger";

export function ProgressBar({
  percent,
  tone = "brand",
  animated = true,
}: {
  percent: number;
  tone?: Tone;
  animated?: boolean;
}) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(100, percent));
  const progress = useSharedValue(animated ? 0 : clamped / 100);

  useEffect(() => {
    if (animated) progress.value = withTiming(clamped / 100, { duration: 450 });
    else progress.value = clamped / 100;
  }, [animated, clamped, progress]);

  // scaleX animates from a fixed-width track — transformOrigin "left" keeps
  // the fill growing rightward from the start, like a normal progress bar,
  // instead of RN's default scale-from-center.
  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progress.value }],
  }));

  const fillColor =
    tone === "amber" ? theme.colors.amber : tone === "danger" ? theme.colors.danger : theme.colors.primary;

  return (
    <View
      style={{
        height: 6,
        borderRadius: theme.radius.full,
        backgroundColor: theme.colors.border,
        overflow: "hidden",
      }}
    >
      <Animated.View
        style={[
          {
            height: "100%",
            width: "100%",
            borderRadius: theme.radius.full,
            backgroundColor: fillColor,
            transformOrigin: "left",
          },
          fillStyle,
        ]}
      />
    </View>
  );
}
