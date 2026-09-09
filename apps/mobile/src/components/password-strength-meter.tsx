import { getPasswordStrength, type PasswordStrengthHint, type PasswordStrengthLevel } from "@keurflow/business";
import { Text, View } from "react-native";
import { ProgressBar } from "./progress-bar";
import { useStyles, useTheme, type Theme } from "../theme";

// Scoring lives in @keurflow/business so web can grade the same way; only the
// wording and colour live here.
const LABELS: Record<Exclude<PasswordStrengthLevel, "empty">, string> = {
  weak: "Faible",
  fair: "Moyen",
  good: "Bon",
  strong: "Fort",
};

const HINTS: Record<PasswordStrengthHint, string> = {
  length: "12 caractères ou plus",
  case: "des majuscules et des minuscules",
  digit: "un chiffre",
  symbol: "un symbole",
};

export function PasswordStrengthMeter({ password }: { password: string }) {
  const theme = useTheme();
  const styles = useStyles(createStyles);
  const { level, percent, missing } = getPasswordStrength(password);

  // Nothing typed yet — showing an empty bar labelled "Faible" would read as a
  // complaint about a field the user hasn't filled in.
  if (level === "empty") return null;

  const tone = level === "weak" ? "danger" : level === "fair" ? "amber" : level === "good" ? "brand" : "success";
  const labelColor =
    level === "weak"
      ? theme.colors.danger
      : level === "fair"
        ? theme.colors.amber
        : level === "good"
          ? theme.colors.text
          : theme.colors.success;

  return (
    <View style={styles.wrapper} accessibilityRole="progressbar" accessibilityLabel={`Force du mot de passe : ${LABELS[level]}`}>
      <ProgressBar percent={percent} tone={tone} />
      <View style={styles.row}>
        <Text style={styles.caption}>Force du mot de passe</Text>
        <Text style={[styles.level, { color: labelColor }]}>{LABELS[level]}</Text>
      </View>
      {missing.length > 0 && <Text style={styles.hint}>Ajoutez {missing.map((m) => HINTS[m]).join(", ")}.</Text>}
    </View>
  );
}

function createStyles(theme: Theme) {
  return {
    wrapper: { gap: 6, marginTop: -6 },
    row: { flexDirection: "row" as const, justifyContent: "space-between" as const, alignItems: "center" as const },
    caption: { fontSize: 12, color: theme.colors.textMuted },
    level: { fontSize: 12, fontWeight: "600" as const },
    hint: { fontSize: 12, color: theme.colors.textMuted },
  };
}
