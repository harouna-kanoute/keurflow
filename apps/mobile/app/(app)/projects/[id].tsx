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
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { minorUnitFor } from "../../../src/lib/projectSummary";
import { supabase } from "../../../src/lib/supabase";
import { colors } from "../../../src/theme";

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

const EXPENSE_STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  needs_information: "Info requise",
  approved: "Approuvée",
  rejected: "Rejetée",
};

const CATEGORY_LABELS = new Map(EXPENSE_CATEGORIES.map((c) => [c.code, c.label]));

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
        <ActivityIndicator color={colors.text} />
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
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.headerBlock}>
        <Text style={styles.title}>{project.name}</Text>
        <Text style={styles.subtitle}>
          {[project.city, STATUS_LABELS[project.status] ?? project.status].filter(Boolean).join(" · ")}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Budget</Text>
        <Text style={styles.bigValue}>
          {formatMoney(project.budget_minor, project.currency_code, minorUnit)}
        </Text>

        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Financé</Text>
          <Text style={styles.metricValue}>
            {formatMoney(totalFunded, project.currency_code, minorUnit)} ({coveragePercent}%)
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${coveragePercent}%` }]} />
        </View>

        <View style={[styles.metricRow, { marginTop: 12 }]}>
          <Text style={styles.metricLabel}>Dépensé (approuvé)</Text>
          <Text style={styles.metricValue}>{consumptionPercent}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${consumptionPercent}%` }]} />
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.cardLabel}>Étapes</Text>
          <Text style={styles.metricValue}>{milestoneProgress}%</Text>
        </View>
        {milestones.length > 0 ? (
          milestones.map((m) => (
            <View key={m.id} style={styles.listRow}>
              <Text style={styles.listRowText}>{m.name}</Text>
              <Text style={styles.listRowMeta}>{MILESTONE_LABELS[m.status] ?? m.status}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>Aucune étape.</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Dépenses récentes</Text>
        {expenses.length > 0 ? (
          expenses.map((e) => (
            <View key={e.id} style={styles.listRow}>
              <View style={{ flexShrink: 1 }}>
                <Text style={styles.listRowText}>
                  {CATEGORY_LABELS.get(e.category) ?? e.category}
                  {e.supplier_name ? ` · ${e.supplier_name}` : ""}
                </Text>
                <Text style={styles.listRowMeta}>{EXPENSE_STATUS_LABELS[e.status] ?? e.status}</Text>
              </View>
              <Text style={styles.listRowText}>
                {formatMoney(e.amount_minor, e.currency_code, minorUnit)}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>Aucune dépense.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" },
  container: { padding: 16, gap: 12 },
  headerBlock: { marginBottom: 4 },
  title: { fontSize: 20, fontWeight: "700", color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.card,
    padding: 16,
    gap: 8,
  },
  cardLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.5, color: colors.textMuted, textTransform: "uppercase" },
  bigValue: { fontSize: 22, fontWeight: "700", color: colors.text },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  metricRow: { flexDirection: "row", justifyContent: "space-between" },
  metricLabel: { fontSize: 13, color: colors.textMuted },
  metricValue: { fontSize: 13, fontWeight: "600", color: colors.text },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: "hidden", marginTop: 4 },
  progressFill: { height: "100%", backgroundColor: colors.primary },
  listRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  listRowText: { fontSize: 13, color: colors.text },
  listRowMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  empty: { fontSize: 13, color: colors.textMuted, paddingVertical: 4 },
});
