import { Text, View } from "react-native";
import { useTheme } from "../theme";

type Tone = "neutral" | "amber" | "brand" | "danger";

export function Badge({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  const theme = useTheme();

  const tones: Record<Tone, { bg: string; text: string }> = {
    neutral: { bg: theme.colors.border, text: theme.colors.textMuted },
    amber: { bg: theme.colors.amberBg, text: theme.colors.amber },
    brand: { bg: theme.colors.brand[100], text: theme.colors.brand[700] },
    danger: { bg: theme.colors.dangerBg, text: theme.colors.danger },
  };
  const { bg, text } = tones[tone];

  return (
    <View
      style={{
        backgroundColor: bg,
        borderRadius: theme.radius.full,
        paddingHorizontal: theme.spacing.sm + 2,
        paddingVertical: 3,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: "600", color: text }}>{label}</Text>
    </View>
  );
}
