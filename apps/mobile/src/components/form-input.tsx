import { Control, Controller, FieldValues, Path } from "react-hook-form";
import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";
import { colors } from "../theme";

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
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            {...inputProps}
          />
          {error && <Text style={styles.error}>{error}</Text>}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: { fontSize: 13, fontWeight: "500", color: colors.textMuted },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.card,
  },
  inputError: { borderColor: colors.danger },
  error: { fontSize: 12, color: colors.danger },
});
