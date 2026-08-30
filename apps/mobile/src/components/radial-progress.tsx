import { useEffect } from "react";
import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Animated, { useAnimatedProps, useSharedValue, withTiming } from "react-native-reanimated";
import { useTheme } from "../theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Tone = "brand" | "success" | "amber" | "danger";

// A plain SVG stroke-dasharray ring — same technique as the web app's
// DonutChart (apps/web/src/components/donut-chart.tsx) — animated on mount
// via Reanimated's useAnimatedProps rather than a charting library.
export function RadialProgress({
  percent,
  size = 88,
  strokeWidth = 9,
  tone = "brand",
  centerLabel,
  centerSublabel,
}: {
  percent: number;
  size?: number;
  strokeWidth?: number;
  tone?: Tone;
  centerLabel?: string;
  centerSublabel?: string;
}) {
  const theme = useTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(clamped / 100, { duration: 650 });
  }, [clamped, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  const tones: Record<Tone, string> = {
    brand: theme.colors.primary,
    success: theme.colors.success,
    amber: theme.colors.amber,
    danger: theme.colors.danger,
  };

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={theme.colors.border} strokeWidth={strokeWidth} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={tones[tone]}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
        />
      </Svg>
      {(centerLabel || centerSublabel) && (
        <View style={{ position: "absolute", alignItems: "center" }}>
          {centerLabel && (
            <Text style={{ fontSize: 16, fontWeight: "700", color: theme.colors.text }}>{centerLabel}</Text>
          )}
          {centerSublabel && (
            <Text style={{ fontSize: 10, color: theme.colors.textMuted }}>{centerSublabel}</Text>
          )}
        </View>
      )}
    </View>
  );
}
