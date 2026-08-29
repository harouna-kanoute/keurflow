import { useState, type ReactNode } from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../theme";

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: "default" | "hero";
  onPress?: () => void;
};

export function Card({ children, style, variant = "default", onPress }: Props) {
  const theme = useTheme();
  const [pressed, setPressed] = useState(false);

  if (variant === "hero") {
    return (
      <LinearGradient
        colors={[theme.colors.brand[600], theme.colors.brand[800]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[{ borderRadius: theme.radius.lg, padding: theme.spacing.xl }, style]}
      >
        {children}
      </LinearGradient>
    );
  }

  const base: StyleProp<ViewStyle> = [
    {
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: pressed ? theme.colors.borderStrong : theme.colors.border,
      backgroundColor: theme.colors.card,
      padding: theme.spacing.xl,
      ...theme.shadow.card,
    },
    style,
  ];

  if (!onPress) return <View style={base}>{children}</View>;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[base, pressed && { opacity: 0.92 }]}
    >
      {children}
    </Pressable>
  );
}
