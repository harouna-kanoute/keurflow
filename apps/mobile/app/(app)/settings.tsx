import { Pressable, ScrollView, Text, View } from "react-native";
import { Card } from "../../src/components/card";
import { DISPLAY_CURRENCY_OPTIONS } from "../../src/lib/display-currency";
import { useDisplayCurrency } from "../../src/lib/display-currency-context";
import { useStyles, type Theme } from "../../src/theme";

// Devise section only for now — appearance (mode/accent/police/taille de
// texte/animations) lands in a follow-up PR once the mobile theme system
// supports manual overrides (today it's OS-driven light/dark only).
export default function SettingsScreen() {
  const styles = useStyles(createStyles);
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
        <View style={styles.optionsGrid}>
          {DISPLAY_CURRENCY_OPTIONS.map((option) => {
            const active = displayCurrency === option.value;
            return (
              <Pressable
                key={option.value}
                style={[styles.optionButton, active && styles.optionButtonActive]}
                onPress={() => setDisplayCurrency(option.value)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.optionText, active && styles.optionTextActive]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>
    </ScrollView>
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
  };
}
