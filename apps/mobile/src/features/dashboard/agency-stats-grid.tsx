import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { MultiCurrencyAmount } from "../../components/multi-currency-amount";
import type { AgencyStats } from "../../lib/agencyStats";
import { useStyles, useTheme, type Theme } from "../../theme";

type Tone = "brand" | "warning" | "danger";

// Mirrors apps/web dashboard/agency-dashboard.tsx's 7-card layout (spec §10,
// §48) — same labels, same data (loadAgencyStats reuses the exact same
// @keurflow/business helpers the web version does).
export function AgencyStatsGrid({ stats }: { stats: AgencyStats }) {
  const styles = useStyles(createStyles);

  return (
    <View style={styles.grid}>
      <StatCard label="Projets actifs" value={stats.activeCount} icon="flag-outline" />
      <StatCard label="Clients" value={stats.clientCount} icon="people-outline" />
      <StatCard
        label="Budget total"
        value={<MultiCurrencyAmount totals={stats.budgetTotals} style={styles.value} />}
        icon="wallet-outline"
      />
      <StatCard
        label="Dépenses"
        value={<MultiCurrencyAmount totals={stats.spentTotals} style={styles.value} />}
        icon="receipt-outline"
      />
      <StatCard label="À vérifier" value={stats.toReviewTotal} icon="time-outline" tone="warning" />
      <StatCard
        label="Documents manquants"
        value={stats.missingDocsTotal}
        icon="alert-circle-outline"
        tone="danger"
      />
      <StatCard
        label="Projets en retard"
        value={stats.delayedCount}
        icon="alert-circle-outline"
        tone="danger"
      />
    </View>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone = "brand",
}: {
  label: string;
  value: React.ReactNode;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: Tone;
}) {
  const theme = useTheme();
  const styles = useStyles(createStyles);
  const toneColors: Record<Tone, { bg: string; fg: string }> = {
    brand: { bg: theme.colors.brand[100], fg: theme.colors.brand[700] },
    warning: { bg: theme.colors.amberBg, fg: theme.colors.amber },
    danger: { bg: theme.colors.dangerBg, fg: theme.colors.danger },
  };
  const { bg, fg } = toneColors[tone];

  return (
    <View style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={18} color={fg} />
      </View>
      <Text style={styles.label}>{label}</Text>
      {typeof value === "string" || typeof value === "number" ? (
        <Text style={styles.value}>{value}</Text>
      ) : (
        value
      )}
    </View>
  );
}

function createStyles(theme: Theme) {
  return {
    grid: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      gap: theme.spacing.sm,
    },
    card: {
      flexBasis: "47%" as const,
      flexGrow: 1,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
      padding: theme.spacing.md,
    },
    iconWrap: {
      width: 32,
      height: 32,
      borderRadius: theme.radius.md,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    label: {
      marginTop: theme.spacing.sm,
      fontSize: 11,
      fontWeight: "600" as const,
      letterSpacing: 0.3,
      textTransform: "uppercase" as const,
      color: theme.colors.textMuted,
    },
    value: { marginTop: 2, fontSize: 15, fontWeight: "700" as const, color: theme.colors.text },
  };
}
