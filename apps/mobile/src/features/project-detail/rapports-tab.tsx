import { useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Card } from "../../components/card";
import { Money } from "../../components/money";
import { RadialProgress } from "../../components/radial-progress";
import { entranceAnimation, useStyles, useTheme, type Theme } from "../../theme";
import { CreateReportSheet } from "./create-report-sheet";
import { buildReportHtml } from "./report-html";
import type { Project, ProjectDetailState, Report } from "./types";

const MAX_STAGGER_INDEX = 8;
const STAGGER_STEP_MS = 50;
const GENERIC_ERROR = "Une erreur est survenue. Veuillez réessayer.";

function slugify(text: string): string {
  const slug = text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug || "rapport";
}

export function RapportsTab({
  state,
  projectId,
  onChanged,
  isBlocked,
}: {
  state: Extract<ProjectDetailState, { status: "ready" }>;
  projectId: string;
  onChanged: () => void;
  isBlocked: boolean;
}) {
  const theme = useTheme();
  const styles = useStyles(createStyles);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { project, reports } = state;

  return (
    <View style={styles.container}>
      <View style={styles.topHeader}>
        <Text style={styles.title}>Rapports</Text>
        {!isBlocked && (
          <Pressable
            style={styles.addButton}
            onPress={() => setSheetOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Générer un rapport"
          >
            <Ionicons name="add" size={18} color={styles.addButtonIcon.color} />
          </Pressable>
        )}
      </View>

      {reports.length === 0 && <Text style={styles.empty}>Aucun rapport.</Text>}

      {reports.map((report, index) => {
        const expanded = expandedId === report.id;
        return (
          <Animated.View
            key={report.id}
            entering={entranceAnimation(theme.reducedMotion, {
              index,
              maxStaggerIndex: MAX_STAGGER_INDEX,
              stepMs: STAGGER_STEP_MS,
              duration: 250,
            })}
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

              {expanded && <ReportDetail project={project} report={report} />}
            </Card>
          </Animated.View>
        );
      })}

      <CreateReportSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onCreated={onChanged}
        projectId={projectId}
        projectName={project.name}
        budgetMinor={project.budget_minor}
        currencyCode={project.currency_code}
      />
    </View>
  );
}

function ReportDetail({ project, report }: { project: Project; report: Report }) {
  const styles = useStyles(createStyles);
  const { metrics } = report;
  const [busy, setBusy] = useState<"print" | "download" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const filenameBase = `rapport-${slugify(project.name)}-${report.period_start}-${report.period_end}`;

  const handlePrint = async () => {
    setError(null);
    setBusy("print");
    try {
      await Print.printAsync({ html: buildReportHtml(project, report) });
    } catch {
      setError(GENERIC_ERROR);
    } finally {
      setBusy(null);
    }
  };

  const handleDownload = async () => {
    setError(null);
    setBusy("download");
    try {
      const { uri } = await Print.printToFileAsync({ html: buildReportHtml(project, report), base64: false });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: `${filenameBase}.pdf`,
        });
      }
    } catch {
      setError(GENERIC_ERROR);
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.detail}>
      <View style={styles.exportRow}>
        <Pressable style={styles.exportButton} onPress={handleDownload} disabled={busy !== null}>
          {busy === "download" ? (
            <ActivityIndicator size="small" color={styles.exportIcon.color} />
          ) : (
            <Ionicons name="download-outline" size={16} color={styles.exportIcon.color} />
          )}
          <Text style={styles.exportLabel}>Télécharger PDF</Text>
        </Pressable>
        <Pressable style={styles.exportButton} onPress={handlePrint} disabled={busy !== null}>
          {busy === "print" ? (
            <ActivityIndicator size="small" color={styles.exportIcon.color} />
          ) : (
            <Ionicons name="print-outline" size={16} color={styles.exportIcon.color} />
          )}
          <Text style={styles.exportLabel}>Imprimer</Text>
        </Pressable>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}

      {metrics && (
        <View style={styles.metricsRow}>
          <RadialProgress percent={metrics.progressPercent} size={64} strokeWidth={7} centerLabel={`${metrics.progressPercent}%`} />
          <View style={styles.statList}>
            <StatLine
              label="Budget"
              value={
                <Money amountMinor={metrics.budgetMinor} currencyCode={metrics.currencyCode} minorUnit={metrics.minorUnit} />
              }
            />
            <StatLine
              label="Financé (période)"
              value={
                <Money amountMinor={metrics.fundedInPeriodMinor} currencyCode={metrics.currencyCode} minorUnit={metrics.minorUnit} />
              }
            />
            <StatLine
              label="Dépensé approuvé (période)"
              value={
                <Money amountMinor={metrics.approvedInPeriodMinor} currencyCode={metrics.currencyCode} minorUnit={metrics.minorUnit} />
              }
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

function StatLine({ label, value }: { label: string; value: ReactNode }) {
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
    topHeader: { flexDirection: "row" as const, justifyContent: "space-between" as const, alignItems: "center" as const },
    title: { fontSize: 16, fontWeight: "700" as const, color: theme.colors.text },
    addButton: {
      width: 32,
      height: 32,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primary,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    addButtonIcon: { color: theme.colors.primaryText },
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
    exportRow: { flexDirection: "row" as const, gap: theme.spacing.sm },
    exportButton: {
      flex: 1,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 6,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      paddingVertical: 9,
    },
    exportIcon: { color: theme.colors.text },
    exportLabel: { fontSize: 13, fontWeight: "600" as const, color: theme.colors.text },
    error: { fontSize: 12, color: theme.colors.danger, textAlign: "center" as const },
  };
}
