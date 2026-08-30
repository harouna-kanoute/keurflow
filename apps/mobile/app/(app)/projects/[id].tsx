import {
  formatMoney,
  getBudgetConsumptionPercent,
  getFundingCoveragePercent,
  getMilestoneProgressPercent,
  getTotalFunded,
} from "@keurflow/business";
import { EXPENSE_CATEGORIES } from "@keurflow/config";
import { useFocusEffect, useLocalSearchParams, useNavigation } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Badge } from "../../../src/components/badge";
import { Card } from "../../../src/components/card";
import { RadialProgress } from "../../../src/components/radial-progress";
import { minorUnitFor } from "../../../src/lib/projectSummary";
import { supabase } from "../../../src/lib/supabase";
import { useStyles, useTheme, type Theme } from "../../../src/theme";

const STATUS_LABELS: Record<string, string> = {
  planning: "Planification",
  active: "Actif",
  paused: "En pause",
  completed: "Terminé",
  archived: "Archivé",
};

const MILESTONE_LABELS: Record<string, string> = {
  pending: "À faire",
  in_progress: "En cours",
  completed: "Terminée",
  delayed: "En retard",
};

// Mirrors apps/web/src/app/dashboard/projects/[id]/page.tsx's
// MILESTONE_STATUS_COLORS mapping (pending=neutral, in_progress=amber,
// completed=success, delayed=danger).
const MILESTONE_TONES: Record<string, "neutral" | "amber" | "success" | "danger"> = {
  pending: "neutral",
  in_progress: "amber",
  completed: "success",
  delayed: "danger",
};

const EXPENSE_STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  needs_information: "Info requise",
  approved: "Approuvée",
  rejected: "Rejetée",
};

const EXPENSE_TONES: Record<string, "neutral" | "amber" | "success" | "danger"> = {
  pending: "neutral",
  needs_information: "amber",
  approved: "success",
  rejected: "danger",
};

const CATEGORY_LABELS = new Map(EXPENSE_CATEGORIES.map((c) => [c.code, c.label]));

// Caps the stagger so a project with many milestones/expenses doesn't take
// seconds to finish animating in.
const MAX_STAGGER_INDEX = 6;
const STAGGER_STEP_MS = 70;

type Project = {
  id: string;
  name: string;
  city: string | null;
  status: string;
  budget_minor: number;
  currency_code: string;
};

type Milestone = { id: string; name: string; status: string };
type Expense = {
  id: string;
  amount_minor: number;
  currency_code: string;
  category: string;
  supplier_name: string | null;
  expense_date: string;
  status: "pending" | "needs_information" | "approved" | "rejected";
};

type State =
  | { status: "loading" }
  | { status: "not-found" }
  | {
      status: "ready";
      project: Project;
      totalFunded: number;
      coveragePercent: number;
      consumptionPercent: number;
      milestoneProgress: number;
      milestones: Milestone[];
      expenses: Expense[];
    };

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const [state, setState] = useState<State>({ status: "loading" });
  const [refreshing, setRefreshing] = useState(false);
  const theme = useTheme();
  const styles = useStyles(createStyles);

  const load = useCallback(async () => {
    // RLS (projects_select_org_or_project_members) is the authoritative
    // check — a project this user can't see simply returns no row here.
    const { data: project } = await supabase
      .from("projects")
      .select("id, name, city, status, budget_minor, currency_code")
      .eq("id", id)
      .maybeSingle();

    if (!project) {
      setState({ status: "not-found" });
      return;
    }

    navigation.setOptions({ title: project.name });

    const [{ data: fundings }, { data: expenses }, { data: milestones }] = await Promise.all([
      supabase.from("fundings").select("amount_minor").eq("project_id", id),
      supabase
        .from("expenses")
        .select("id, amount_minor, currency_code, category, supplier_name, expense_date, status")
        .eq("project_id", id)
        .order("expense_date", { ascending: false })
        .limit(10),
      supabase.from("milestones").select("id, name, status").eq("project_id", id),
    ]);

    const fundingList = (fundings ?? []).map((f) => ({ amountMinor: f.amount_minor }));
    const expenseList = (expenses ?? []).map((e) => ({
      amountMinor: e.amount_minor,
      status: e.status as Expense["status"],
    }));

    setState({
      status: "ready",
      project,
      totalFunded: getTotalFunded(fundingList),
      coveragePercent: getFundingCoveragePercent(project.budget_minor, fundingList),
      consumptionPercent: getBudgetConsumptionPercent(project.budget_minor, expenseList),
      milestoneProgress: getMilestoneProgressPercent(
        (milestones ?? []).map((m) => ({ status: m.status as never })),
      ),
      milestones: milestones ?? [],
      expenses: (expenses ?? []) as Expense[],
    });
  }, [id, navigation]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (state.status === "loading") {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (state.status === "not-found") {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>Chantier introuvable.</Text>
      </View>
    );
  }

  const { project, totalFunded, coveragePercent, consumptionPercent, milestoneProgress, milestones, expenses } =
    state;
  const minorUnit = minorUnitFor(project.currency_code);

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
      }
    >
      <Animated.View entering={FadeInUp.duration(400)} style={styles.headerBlock}>
        <Text style={styles.title}>{project.name}</Text>
        <View style={styles.subtitleRow}>
          {project.city && <Text style={styles.subtitle}>{project.city}</Text>}
          <Badge label={STATUS_LABELS[project.status] ?? project.status} tone="brand" />
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(70).duration(400)}>
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

      <Animated.View entering={FadeInUp.delay(140).duration(400)}>
        <Card style={styles.stackedCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <RadialProgress percent={milestoneProgress} size={40} strokeWidth={5} centerLabel="" />
              <Text style={styles.cardLabel}>Étapes</Text>
            </View>
            <Text style={styles.metricValue}>{milestoneProgress}%</Text>
          </View>
          {milestones.length > 0 ? (
            milestones.map((m, index) => (
              <Animated.View
                key={m.id}
                entering={FadeInUp.delay(Math.min(index, MAX_STAGGER_INDEX) * STAGGER_STEP_MS).duration(300)}
                style={styles.listRow}
              >
                <Text style={styles.listRowText}>{m.name}</Text>
                <Badge label={MILESTONE_LABELS[m.status] ?? m.status} tone={MILESTONE_TONES[m.status] ?? "neutral"} />
              </Animated.View>
            ))
          ) : (
            <Text style={styles.empty}>Aucune étape.</Text>
          )}
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(210).duration(400)}>
        <Card style={styles.stackedCard}>
          <Text style={styles.cardLabel}>Dépenses récentes</Text>
          {expenses.length > 0 ? (
            expenses.map((e, index) => (
              <Animated.View
                key={e.id}
                entering={FadeInUp.delay(Math.min(index, MAX_STAGGER_INDEX) * STAGGER_STEP_MS).duration(300)}
                style={styles.listRow}
              >
                <View style={{ flexShrink: 1, gap: 4 }}>
                  <Text style={styles.listRowText}>
                    {CATEGORY_LABELS.get(e.category) ?? e.category}
                    {e.supplier_name ? ` · ${e.supplier_name}` : ""}
                  </Text>
                  <Badge label={EXPENSE_STATUS_LABELS[e.status] ?? e.status} tone={EXPENSE_TONES[e.status] ?? "neutral"} />
                </View>
                <Text style={styles.listRowText}>
                  {formatMoney(e.amount_minor, e.currency_code, minorUnit)}
                </Text>
              </Animated.View>
            ))
          ) : (
            <Text style={styles.empty}>Aucune dépense.</Text>
          )}
        </Card>
      </Animated.View>
    </ScrollView>
  );
}

function createStyles(theme: Theme) {
  return {
    flex: { flex: 1, backgroundColor: theme.colors.background },
    center: {
      flex: 1,
      backgroundColor: theme.colors.background,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    container: { padding: theme.spacing.lg, gap: theme.spacing.md },
    headerBlock: { marginBottom: 4, gap: theme.spacing.sm },
    title: { ...theme.typography.title, color: theme.colors.text },
    subtitleRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: theme.spacing.sm },
    subtitle: { fontSize: 13, color: theme.colors.textMuted },
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
