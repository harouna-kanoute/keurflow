import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { Card } from "../../src/components/card";
import { DISPLAY_CURRENCY_OPTIONS } from "../../src/lib/display-currency";
import { useDisplayCurrency } from "../../src/lib/display-currency-context";
import {
  ACCENT_OPTIONS,
  FONT_OPTIONS,
  MODE_OPTIONS,
  TEXT_SIZE_OPTIONS,
  useStyles,
  useTheme,
  type Theme,
} from "../../src/theme";

export default function SettingsScreen() {
  const styles = useStyles(createStyles);
  const theme = useTheme();
  const { displayCurrency, setDisplayCurrency } = useDisplayCurrency();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Paramètres</Text>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Devise d&apos;affichage</Text>
        <Text style={styles.sectionDescription}>
          Convertit les montants affichés (tableau de bord, chantiers, rapports, abonnement) pour
          la lecture — ne modifie rien d&apos;enregistré.
        </Text>
        <OptionButtons
          options={DISPLAY_CURRENCY_OPTIONS}
          value={displayCurrency}
          onChange={setDisplayCurrency}
        />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Mode</Text>
        <OptionButtons options={MODE_OPTIONS} value={theme.mode} onChange={theme.setMode} />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Couleur d&apos;accent</Text>
        <View style={styles.accentGrid}>
          {ACCENT_OPTIONS.map((option) => {
            const active = theme.accent === option.value;
            return (
              <Pressable
                key={option.value}
                style={styles.accentItem}
                onPress={() => theme.setAccent(option.value)}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                accessibilityState={{ selected: active }}
              >
                <View
                  style={[
                    styles.accentSwatch,
                    { backgroundColor: option.swatch },
                    active && styles.accentSwatchActive,
                  ]}
                />
                <Text style={styles.accentLabel}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Police</Text>
        <OptionButtons options={FONT_OPTIONS} value={theme.font} onChange={theme.setFont} />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Taille du texte</Text>
        <OptionButtons options={TEXT_SIZE_OPTIONS} value={theme.textSize} onChange={theme.setTextSize} />
      </Card>

      <Card style={styles.card}>
        <View style={styles.switchRow}>
          <View style={styles.switchTextBlock}>
            <Text style={styles.sectionTitle}>Réduire les animations</Text>
            <Text style={styles.sectionDescription}>Désactive les transitions de l&apos;interface.</Text>
          </View>
          <Switch
            value={theme.reducedMotion}
            onValueChange={theme.setReducedMotion}
            trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
            thumbColor="#ffffff"
          />
        </View>
      </Card>
    </ScrollView>
  );
}

function OptionButtons<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const styles = useStyles(createStyles);
  return (
    <View style={styles.optionsGrid}>
      {options.map((option) => {
        const active = value === option.value;
        return (
          <Pressable
            key={option.value}
            style={[styles.optionButton, active && styles.optionButtonActive]}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.optionText, active && styles.optionTextActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles(theme: Theme) {
  return {
    container: { padding: theme.spacing.lg, gap: theme.spacing.md },
    title: { ...theme.typography.title, color: theme.colors.text },
    card: { gap: theme.spacing.sm },
    sectionTitle: { fontSize: 15, fontWeight: "700" as const, color: theme.colors.text },
    sectionDescription: { fontSize: 12, color: theme.colors.textMuted, lineHeight: 17 },
    optionsGrid: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: theme.spacing.sm, marginTop: 4 },
    optionButton: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm + 2,
    },
    optionButtonActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.unreadBg },
    optionText: { fontSize: 13, fontWeight: "500" as const, color: theme.colors.text },
    optionTextActive: { color: theme.colors.brand[700], fontWeight: "600" as const },
    accentGrid: { flexDirection: "row" as const, gap: theme.spacing.md, marginTop: 4 },
    accentItem: { alignItems: "center" as const, gap: 6 },
    accentSwatch: {
      width: 32,
      height: 32,
      borderRadius: theme.radius.full,
      borderWidth: 2,
      borderColor: "transparent",
    },
    accentSwatchActive: { borderColor: theme.colors.text },
    accentLabel: { fontSize: 11, color: theme.colors.textMuted },
    switchRow: { flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "space-between" as const, gap: theme.spacing.md },
    switchTextBlock: { flex: 1, gap: 2 },
  };
}
