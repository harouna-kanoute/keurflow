import { useState } from "react";
import { Control, Controller, FieldValues, Path } from "react-hook-form";
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";

type Option = { value: string; label: string };

type Props<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  label: string;
  options: readonly Option[];
  error?: string;
  placeholder?: string;
};

export function SelectField<T extends FieldValues>({
  control,
  name,
  label,
  options,
  error,
  placeholder = "Sélectionner…",
}: Props<T>) {
  const [open, setOpen] = useState(false);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value } }) => {
        const selected = options.find((o) => o.value === value);
        return (
          <View style={styles.wrapper}>
            <Text style={styles.label}>{label}</Text>
            <Pressable
              style={[styles.input, error ? styles.inputError : null]}
              onPress={() => setOpen(true)}
            >
              <Text style={selected ? styles.value : styles.placeholder}>
                {selected ? selected.label : placeholder}
              </Text>
            </Pressable>
            {error && <Text style={styles.error}>{error}</Text>}

            <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
              <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
                <View style={styles.sheet}>
                  <Text style={styles.sheetTitle}>{label}</Text>
                  <FlatList
                    data={options}
                    keyExtractor={(item) => item.value}
                    style={{ maxHeight: 360 }}
                    renderItem={({ item }) => (
                      <Pressable
                        style={styles.option}
                        onPress={() => {
                          onChange(item.value);
                          setOpen(false);
                        }}
                      >
                        <Text style={styles.optionText}>{item.label}</Text>
                      </Pressable>
                    )}
                  />
                </View>
              </Pressable>
            </Modal>
          </View>
        );
      }}
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
    backgroundColor: colors.card,
  },
  inputError: { borderColor: colors.danger },
  value: { fontSize: 15, color: colors.text },
  placeholder: { fontSize: 15, color: colors.textMuted },
  error: { fontSize: 12, color: colors.danger },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 16,
    paddingBottom: 32,
    paddingHorizontal: 8,
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  option: { paddingHorizontal: 12, paddingVertical: 12, borderRadius: 8 },
  optionText: { fontSize: 15, color: colors.text },
});
