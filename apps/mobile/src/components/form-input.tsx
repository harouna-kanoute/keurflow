import { Control, Controller, FieldValues, Path } from "react-hook-form";
import { Text, TextInput, TextInputProps, View } from "react-native";
import { useStyles, useTheme, type Theme } from "../theme";

type Props<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  label: string;
  error?: string;
} & Omit<TextInputProps, "value" | "onChangeText">;

export function FormInput<T extends FieldValues>({
  control,
  name,
  label,
  error,
  ...inputProps
}: Props<T>) {
  const theme = useTheme();
  const styles = useStyles(createStyles);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value } }) => (
        <View style={styles.wrapper}>
          <Text style={styles.label}>{label}</Text>
          <TextInput
            style={[styles.input, error ? styles.inputError : null]}
            onBlur={onBlur}
            onChangeText={onChange}
            value={typeof value === "string" ? value : (value ?? "")}
            placeholderTextColor={theme.colors.textMuted}
            autoCapitalize="none"
            {...inputProps}
          />
          {error && <Text style={styles.error}>{error}</Text>}
        </View>
      )}
    />
  );
}

function createStyles(theme: Theme) {
  return {
    wrapper: { gap: 6 },
    label: { fontSize: 13, fontWeight: "500" as const, color: theme.colors.textMuted },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 15,
      color: theme.colors.text,
      backgroundColor: theme.colors.card,
    },
    inputError: { borderColor: theme.colors.danger },
    error: { fontSize: 12, color: theme.colors.danger },
  };
}
