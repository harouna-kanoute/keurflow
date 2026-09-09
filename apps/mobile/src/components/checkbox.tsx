import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { useStyles, useTheme, type Theme } from "../theme";

export function Checkbox({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const styles = useStyles(createStyles);

  return (
    // The label is part of the pressable, not a sibling — a 20px box is a
    // miserable target on a phone.
    <Pressable
      style={styles.row}
      onPress={() => onChange(!checked)}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={label}
    >
      <View style={[styles.box, checked ? styles.boxChecked : null, disabled ? styles.boxDisabled : null]}>
        {checked && <Ionicons name="checkmark" size={14} color={theme.colors.primaryText} />}
      </View>
      <Text style={[styles.label, disabled ? styles.labelDisabled : null]}>{label}</Text>
    </Pressable>
  );
}

function createStyles(theme: Theme) {
  return {
    row: { flexDirection: "row" as const, alignItems: "center" as const, gap: 10, paddingVertical: 4 },
    box: {
      width: 20,
      height: 20,
      borderRadius: theme.radius.sm,
      borderWidth: 1,
      borderColor: theme.colors.borderStrong,
      backgroundColor: theme.colors.card,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    boxChecked: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    boxDisabled: { opacity: 0.5 },
    label: { fontSize: 14, color: theme.colors.text },
    labelDisabled: { color: theme.colors.textMuted },
  };
}
