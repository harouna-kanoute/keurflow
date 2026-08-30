import { formatMoney } from "@keurflow/business";
import { Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Badge } from "../../components/badge";
import { Card } from "../../components/card";
import { RadialProgress } from "../../components/radial-progress";
import { minorUnitFor } from "../../lib/projectSummary";
import { useStyles, type Theme } from "../../theme";
import { MILESTONE_LABELS, MILESTONE_TONES } from "./status-labels";
import type { ProjectDetailState } from "./types";

export function ApercuTab({ state }: { state: Extract<ProjectDetailState, { status: "ready" }> }) {
  const styles = useStyles(createStyles);
  const { project, totalFunded, coveragePercent, consumptionPercent, milestoneProgress, milestones } = state;
  const minorUnit = minorUnitFor(project.currency_code);

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInUp.duration(300)}>
        <Card>
          <Text style={styles.cardLabel}>Budget</Text>
          <Text style={styles.bigValue}>
            {formatMoney(project.budget_minor, project.currency_code, minorUnit)}
          </Text>

          <View style={styles.donutRow}>
            <View style={styles.donutBlock}>
              <RadialProgress percent={coveragePercent} centerLabel={`${coveragePercent}%`} tone="brand" />
              <Text style={styles.donutLabel}>Financé</Text>
              <Text style={styles.donutValue}>
                {formatMoney(totalFunded, project.currency_code, minorUnit)}
              </Text>
            </View>
            <View style={styles.donutBlock}>
              <RadialProgress percent={consumptionPercent} centerLabel={`${consumptionPercent}%`} tone="amber" />
              <Text style={styles.donutLabel}>Dépensé (approuvé)</Text>
            </View>
          </View>
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(70).duration(300)}>
        <Card style={styles.stackedCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <RadialProgress percent={milestoneProgress} size={40} strokeWidth={5} centerLabel="" />
              <Text style={styles.cardLabel}>Étapes</Text>
            </View>
            <Text style={styles.metricValue}>{milestoneProgress}%</Text>
          </View>
          {milestones.length > 0 ? (
            milestones.map((m) => (
              <View key={m.id} style={styles.listRow}>
                <Text style={styles.listRowText}>{m.name}</Text>
                <Badge label={MILESTONE_LABELS[m.status] ?? m.status} tone={MILESTONE_TONES[m.status] ?? "neutral"} />
              </View>
            ))
          ) : (
            <Text style={styles.empty}>Aucune étape.</Text>
          )}
        </Card>
      </Animated.View>
    </View>
  );
}

function createStyles(theme: Theme) {
  return {
    container: { gap: theme.spacing.md },
    stackedCard: { gap: theme.spacing.sm },
    cardLabel: {
      fontSize: 11,
      fontWeight: "600" as const,
      letterSpacing: 0.5,
      color: theme.colors.textMuted,
      textTransform: "uppercase" as const,
    },
    bigValue: { fontSize: 24, fontWeight: "700" as const, color: theme.colors.text, marginTop: 2 },
    donutRow: {
      flexDirection: "row" as const,
      justifyContent: "space-around" as const,
      marginTop: theme.spacing.lg,
    },
    donutBlock: { alignItems: "center" as const, gap: 4 },
    donutLabel: { fontSize: 12, color: theme.colors.textMuted, marginTop: 4 },
    donutValue: { fontSize: 13, fontWeight: "600" as const, color: theme.colors.text },
    sectionHeader: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
    },
    sectionHeaderLeft: { flexDirection: "row" as const, alignItems: "center" as const, gap: theme.spacing.sm },
    metricValue: { fontSize: 13, fontWeight: "600" as const, color: theme.colors.text },
    listRow: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      paddingVertical: theme.spacing.sm + 2,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      gap: theme.spacing.sm,
    },
    listRowText: { fontSize: 13, color: theme.colors.text },
    empty: { fontSize: 13, color: theme.colors.textMuted, paddingVertical: 4 },
  };
}
