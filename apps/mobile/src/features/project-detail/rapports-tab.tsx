import { formatMoney } from "@keurflow/business";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "../../components/card";
import { RadialProgress } from "../../components/radial-progress";
import { useStyles, type Theme } from "../../theme";
import type { ProjectDetailState, Report } from "./types";

const MAX_STAGGER_INDEX = 8;
const STAGGER_STEP_MS = 50;

// Read-only in Phase 1 — creating a report and PDF/print export (web's
// html2canvas + jsPDF pipeline, browser-only) are out of scope for mobile.
export function RapportsTab({ state }: { state: Extract<ProjectDetailState, { status: "ready" }> }) {
  const styles = useStyles(createStyles);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { reports } = state;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rapports</Text>

      {reports.length === 0 && <Text style={styles.empty}>Aucun rapport.</Text>}

      {reports.map((report, index) => {
        const expanded = expandedId === report.id;
        return (
          <Animated.View
            key={report.id}
            entering={FadeInUp.delay(Math.min(index, MAX_STAGGER_INDEX) * STAGGER_STEP_MS).duration(250)}
          >
            <Card style={styles.card}>
              <Pressable
                style={styles.header}
                onPress={() => setExpandedId(expanded ? null : report.id)}
                accessibilityRole="button"
              >
                <Text style={styles.period}>
                  {report.period_start} → {report.period_end}
                </Text>
                <Ionicons
                  name={expanded ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={styles.chevron.color}
                />
              </Pressable>

              {expanded && <ReportDetail report={report} />}
            </Card>
          </Animated.View>
        );
      })}
    </View>
  );
}

function ReportDetail({ report }: { report: Report }) {
  const styles = useStyles(createStyles);
  const { metrics } = report;

  return (
    <View style={styles.detail}>
      {metrics && (
        <View style={styles.metricsRow}>
          <RadialProgress percent={metrics.progressPercent} size={64} strokeWidth={7} centerLabel={`${metrics.progressPercent}%`} />
          <View style={styles.statList}>
            <StatLine
              label="Budget"
              value={formatMoney(metrics.budgetMinor, metrics.currencyCode, metrics.minorUnit)}
            />
            <StatLine
              label="Financé (période)"
              value={formatMoney(metrics.fundedInPeriodMinor, metrics.currencyCode, metrics.minorUnit)}
            />
            <StatLine
              label="Dépensé approuvé (période)"
              value={formatMoney(metrics.approvedInPeriodMinor, metrics.currencyCode, metrics.minorUnit)}
            />
            <StatLine label="Étapes" value={`${metrics.milestonesCompleted}/${metrics.milestonesTotal}`} />
            <StatLine label="Documents manquants" value={String(metrics.documentsMissingCount)} />
            <StatLine label="À vérifier" value={String(metrics.toReviewCount)} />
          </View>
        </View>
      )}
      <Text style={styles.summary}>{report.summary}</Text>
    </View>
  );
}

function StatLine({ label, value }: { label: string; value: string }) {
  const styles = useStyles(createStyles);
  return (
    <View style={styles.statLine}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function createStyles(theme: Theme) {
  return {
    container: { gap: theme.spacing.md },
    title: { fontSize: 16, fontWeight: "700" as const, color: theme.colors.text },
    empty: { fontSize: 13, color: theme.colors.textMuted, textAlign: "center" as const, marginTop: 12 },
    card: { padding: 0, overflow: "hidden" as const },
    header: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    period: { fontSize: 14, fontWeight: "600" as const, color: theme.colors.text },
    chevron: { color: theme.colors.textMuted },
    detail: {
      gap: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.lg,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingTop: theme.spacing.md,
    },
    metricsRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: theme.spacing.lg },
    statList: { flex: 1, gap: 4 },
    statLine: { flexDirection: "row" as const, justifyContent: "space-between" as const, gap: theme.spacing.sm },
    statLabel: { fontSize: 12, color: theme.colors.textMuted, flexShrink: 1 },
    statValue: { fontSize: 12, fontWeight: "600" as const, color: theme.colors.text },
    summary: { fontSize: 13, color: theme.colors.text, lineHeight: 19 },
  };
}
