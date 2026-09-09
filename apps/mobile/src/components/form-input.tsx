import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Control, Controller, FieldValues, Path } from "react-hook-form";
import { Pressable, Text, TextInput, TextInputProps, View } from "react-native";
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
  secureTextEntry,
  ...inputProps
}: Props<T>) {
  const theme = useTheme();
  const styles = useStyles(createStyles);
  const [rawText, setRawText] = useState("");
  const [revealed, setRevealed] = useState(false);

  // Every masked field gets the reveal toggle — typing a password blind on a
  // phone keyboard is where most failed sign-ins come from.
  const maskable = Boolean(secureTextEntry);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value } }) => (
        <View style={styles.wrapper}>
          <Text style={styles.label}>{label}</Text>
          <View>
            <TextInput
              style={[
                styles.input,
                error ? styles.inputError : null,
                maskable ? styles.inputWithToggle : null,
                style,
              ]}
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
              secureTextEntry={maskable && !revealed}
              {...inputProps}
            />
            {maskable && (
              <Pressable
                style={styles.toggle}
                onPress={() => setRevealed((r) => !r)}
                // The toggle sits inside the field, so its own touch target is
                // small — hitSlop brings it back to a comfortable size without
                // widening the input's padding.
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={revealed ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                accessibilityState={{ selected: revealed }}
              >
                <Ionicons
                  name={revealed ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={theme.colors.textMuted}
                />
              </Pressable>
            )}
          </View>
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
    // Keeps the text from running under the reveal button.
    inputWithToggle: { paddingRight: 44 },
    toggle: {
      position: "absolute" as const,
      right: 0,
      top: 0,
      bottom: 0,
      width: 44,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    inputError: { borderColor: theme.colors.danger },
    error: { fontSize: 12, color: theme.colors.danger },
  };
}
