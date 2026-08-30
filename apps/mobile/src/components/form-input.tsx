import { useState } from "react";
import { Control, Controller, FieldValues, Path } from "react-hook-form";
import { Text, TextInput, TextInputProps, View } from "react-native";
import { useStyles, useTheme, type Theme } from "../theme";

type Props<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  label: string;
  error?: string;
  // Transforms the raw text into the value actually stored on the form
  // field before validation — e.g. converting a typed major-unit amount
  // ("150.00") into minor units (15000) the way web's
  // `register(..., { setValueAs })` does. When set, the input tracks its
  // own displayed text locally (what the user actually typed) instead of
  // reflecting the parsed field value back, since those two don't share a
  // format. Text fields that map 1:1 to a string schema field don't need this.
  parse?: (text: string) => unknown;
} & Omit<TextInputProps, "value" | "onChangeText">;

export function FormInput<T extends FieldValues>({
  control,
  name,
  label,
  error,
  parse,
  style,
  ...inputProps
}: Props<T>) {
  const theme = useTheme();
  const styles = useStyles(createStyles);
  const [rawText, setRawText] = useState("");

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value } }) => (
        <View style={styles.wrapper}>
          <Text style={styles.label}>{label}</Text>
          <TextInput
            style={[styles.input, error ? styles.inputError : null, style]}
            onBlur={onBlur}
            onChangeText={(text) => {
              if (parse) {
                setRawText(text);
                onChange(text === "" ? undefined : parse(text));
              } else {
                onChange(text);
              }
            }}
            value={parse ? rawText : typeof value === "string" ? value : (value ?? "")}
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
