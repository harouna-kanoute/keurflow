import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { colors } from "../theme";

type Props = {
  onPress: () => void;
  children: string;
  pending?: boolean;
  variant?: "primary" | "secondary";
};

export function PrimaryButton({ onPress, children, pending, variant = "primary" }: Props) {
  const isPrimary = variant === "primary";
  return (
    <Pressable
      onPress={onPress}
      disabled={pending}
      style={[
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        pending && styles.disabled,
      ]}
    >
      {pending ? (
        <ActivityIndicator color={isPrimary ? colors.primaryText : colors.text} />
      ) : (
        <Text style={isPrimary ? styles.primaryText : styles.secondaryText}>{children}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.borderStrong },
  disabled: { opacity: 0.5 },
  primaryText: { color: colors.primaryText, fontSize: 15, fontWeight: "600" },
  secondaryText: { color: colors.text, fontSize: 15, fontWeight: "600" },
});
