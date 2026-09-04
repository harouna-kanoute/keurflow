import { isProjectDelayed } from "@keurflow/business";
import { PROJECT_TYPES } from "@keurflow/config";
import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { Badge } from "../../components/badge";
import { Card } from "../../components/card";
import { Money } from "../../components/money";
import { RadialProgress } from "../../components/radial-progress";
import { minorUnitFor } from "../../lib/projectSummary";
import { entranceAnimation, useStyles, useTheme, type Theme } from "../../theme";
import { MILESTONE_LABELS, MILESTONE_TONES } from "./status-labels";
import type { ProjectDetailState } from "./types";

const PROJECT_TYPE_LABELS = new Map(PROJECT_TYPES.map((t) => [t.code, t.label]));

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleDateString("fr-FR") : "—";
}

export function ApercuTab({ state }: { state: Extract<ProjectDetailState, { status: "ready" }> }) {
  const theme = useTheme();
  const styles = useStyles(createStyles);
  const { project, totalFunded, coveragePercent, consumptionPercent, milestoneProgress, milestones } = state;
  const minorUnit = minorUnitFor(project.currency_code);
  const delayed = isProjectDelayed(
    project.expected_end_date,
    project.status as "planning" | "active" | "paused" | "completed" | "archived",
  );
  const location = [project.city, project.address].filter(Boolean).join(" — ") || "—";

  return (
    <View style={styles.container}>
      <Animated.View entering={entranceAnimation(theme.reducedMotion, { duration: 300 })}>
        <Card style={styles.stackedCard}>
          <Text style={styles.cardLabel}>Informations du chantier</Text>
          <InfoRow icon="hammer-outline" label="Type" value={PROJECT_TYPE_LABELS.get(project.project_type) ?? project.project_type} />
          <InfoRow icon="earth-outline" label="Pays" value={project.countryName ?? "—"} />
          <InfoRow icon="location-outline" label="Localisation" value={location} />
          <InfoRow
            icon="resize-outline"
            label="Superficie"
            value={project.surface_area != null ? `${project.surface_area} m²` : "—"}
          />
          <InfoRow
            icon="calendar-outline"
            label="Calendrier"
            value={`${formatDate(project.start_date)} → ${formatDate(project.expected_end_date)}`}
            badge={delayed ? "En retard" : undefined}
          />
          {project.description && (
            <View style={styles.description}>
              <Text style={styles.descriptionLabel}>Description</Text>
              <Text style={styles.descriptionText}>{project.description}</Text>
            </View>
          )}
        </Card>
      </Animated.View>

      <Animated.View entering={entranceAnimation(theme.reducedMotion, { delay: 40, duration: 300 })}>
        <Card>
          <Text style={styles.cardLabel}>Budget</Text>
          <Money
            amountMinor={project.budget_minor}
            currencyCode={project.currency_code}
            minorUnit={minorUnit}
            style={styles.bigValue}
          />

          <View style={styles.donutRow}>
            <View style={styles.donutBlock}>
              <RadialProgress percent={coveragePercent} centerLabel={`${coveragePercent}%`} tone="brand" />
              <Text style={styles.donutLabel}>Financé</Text>
              <Money
                amountMinor={totalFunded}
                currencyCode={project.currency_code}
                minorUnit={minorUnit}
                style={styles.donutValue}
              />
            </View>
            <View style={styles.donutBlock}>
              <RadialProgress percent={consumptionPercent} centerLabel={`${consumptionPercent}%`} tone="amber" />
              <Text style={styles.donutLabel}>Dépensé (approuvé)</Text>
            </View>
          </View>
        </Card>
      </Animated.View>

      <Animated.View entering={entranceAnimation(theme.reducedMotion, { delay: 70, duration: 300 })}>
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

function InfoRow({
  icon,
  label,
  value,
  badge,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  badge?: string;
}) {
  const theme = useTheme();
  const styles = useStyles(createStyles);
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={theme.colors.textMuted} style={styles.infoIcon} />
      <Text style={styles.infoLabel}>{label}</Text>
      <View style={styles.infoValueWrap}>
        <Text style={styles.infoValue} numberOfLines={2}>
          {value}
        </Text>
        {badge && <Badge label={badge} tone="danger" />}
      </View>
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
    infoRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    infoIcon: { width: 16 },
    infoLabel: { fontSize: 13, color: theme.colors.textMuted, width: 92 },
    infoValueWrap: { flex: 1, flexDirection: "row" as const, alignItems: "center" as const, gap: theme.spacing.sm, flexWrap: "wrap" as const },
    infoValue: { fontSize: 13, fontWeight: "600" as const, color: theme.colors.text, flexShrink: 1 },
    description: {
      marginTop: theme.spacing.sm,
      borderLeftWidth: 2,
      borderLeftColor: theme.colors.brand[200],
      backgroundColor: theme.colors.background,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
    },
    descriptionLabel: { fontSize: 11, color: theme.colors.textMuted },
    descriptionText: { marginTop: 4, fontSize: 13, color: theme.colors.text },
  };
}
