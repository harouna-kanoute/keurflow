import { ActivityIndicator, Pressable, Text } from "react-native";
import { useStyles } from "../theme";
import type { Theme } from "../theme";

type Props = {
  onPress: () => void;
  children: string;
  pending?: boolean;
  variant?: "primary" | "secondary";
  size?: "md" | "lg";
};

export function PrimaryButton({
  onPress,
  children,
  pending,
  variant = "primary",
  size = "md",
}: Props) {
  const isPrimary = variant === "primary";
  const styles = useStyles(createStyles);

  return (
    <Pressable
      onPress={onPress}
      disabled={pending}
      style={[
        styles.base,
        size === "lg" && styles.lg,
        isPrimary ? styles.primary : styles.secondary,
        pending && styles.disabled,
      ]}
    >
      {pending ? (
        <ActivityIndicator color={isPrimary ? styles.primaryText.color : styles.secondaryText.color} />
      ) : (
        <Text style={[isPrimary ? styles.primaryText : styles.secondaryText, size === "lg" && styles.lgText]}>
          {children}
        </Text>
      )}
    </Pressable>
  );
}

function createStyles(theme: Theme) {
  return {
    base: {
      height: 44,
      borderRadius: theme.radius.full,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      paddingHorizontal: theme.spacing.xl,
    },
    lg: { height: 52, paddingHorizontal: theme.spacing.xxl },
    primary: { backgroundColor: theme.colors.primary },
    secondary: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: theme.colors.borderStrong,
    },
    disabled: { opacity: 0.5 },
    primaryText: { color: theme.colors.primaryText, fontSize: 15, fontWeight: "600" as const },
    secondaryText: { color: theme.colors.text, fontSize: 15, fontWeight: "600" as const },
    lgText: { fontSize: 16 },
  };
}
