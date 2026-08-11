import { formatMoney } from "@keurflow/business";
import { Link, router } from "expo-router";
import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { minorUnitFor, loadProjectSummary, type ProjectSummary } from "../../src/lib/projectSummary";
import { supabase } from "../../src/lib/supabase";
import { colors } from "../../src/theme";

const ORGANIZATION_TYPE_LABELS: Record<string, string> = {
  individual: "Particulier",
  agency: "Agence immobilière",
  company: "Entreprise",
};

type State =
  | { status: "loading" }
  | { status: "no-org" }
  | { status: "ready"; orgName: string; orgType: string; projects: ProjectSummary[] };

export default function ProjectListScreen() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [unreadCount, setUnreadCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null);
    setUnreadCount(count ?? 0);

    // RLS (organization_members_select_same_org) already scopes this to
    // organizations the user actually belongs to.
    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (!membership) {
      setState({ status: "no-org" });
      return;
    }

    const { data: organization } = await supabase
      .from("organizations")
      .select("id, name, type")
      .eq("id", membership.organization_id)
      .single();

    if (!organization) {
      setState({ status: "no-org" });
      return;
    }

    // RLS (projects_select_org_or_project_members) filters this to projects
    // this user can actually see.
    const { data: projects } = await supabase
      .from("projects")
      .select("id, name, status, budget_minor, currency_code")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false });

    const summaries = await Promise.all((projects ?? []).map(loadProjectSummary));

    setState({
      status: "ready",
      orgName: organization.name,
      orgType: organization.type,
      projects: summaries,
    });
  }, []);

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

  const header = (
    <View style={styles.header}>
      <View style={styles.topRow}>
        <Pressable onPress={() => router.push("/notifications")} style={styles.notifLink}>
          <Text style={styles.notifText}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </Pressable>
        <Pressable onPress={() => supabase.auth.signOut()}>
          <Text style={styles.signOut}>Se déconnecter</Text>
        </Pressable>
      </View>
      {state.status === "ready" && (
        <View style={styles.orgCard}>
          <Text style={styles.orgType}>
            {ORGANIZATION_TYPE_LABELS[state.orgType] ?? state.orgType}
          </Text>
          <Text style={styles.orgName}>{state.orgName}</Text>
        </View>
      )}
    </View>
  );

  if (state.status === "no-org") {
    return (
      <View style={styles.center}>
        {header}
        <Text style={styles.empty}>
          Aucune organisation associée à votre compte. Créez-la depuis l'application web pour
          commencer.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.list}
      data={state.projects}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={header}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListEmptyComponent={<Text style={styles.empty}>Aucun chantier créé.</Text>}
      renderItem={({ item }) => {
        const minorUnit = minorUnitFor(item.currency_code);
        return (
          <Link href={`/projects/${item.id}`} asChild>
            <Pressable style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                {item.toReviewCount > 0 && (
                  <View style={styles.reviewBadge}>
                    <Text style={styles.reviewBadgeText}>{item.toReviewCount} à vérifier</Text>
                  </View>
                )}
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${item.progressPercent}%` }]} />
              </View>
              <View style={styles.statsRow}>
                <View>
                  <Text style={styles.statLabel}>Budget</Text>
                  <Text style={styles.statValue}>
                    {formatMoney(item.budget_minor, item.currency_code, minorUnit)}
                  </Text>
                </View>
                <View>
                  <Text style={styles.statLabel}>Financé</Text>
                  <Text style={styles.statValue}>
                    {formatMoney(item.funded, item.currency_code, minorUnit)}
                  </Text>
                </View>
                <View>
                  <Text style={styles.statLabel}>Dépensé</Text>
                  <Text style={styles.statValue}>
                    {formatMoney(item.spent, item.currency_code, minorUnit)}
                  </Text>
                </View>
              </View>
            </Pressable>
          </Link>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", padding: 24 },
  list: { padding: 16, gap: 12 },
  header: { gap: 12, marginBottom: 8 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  notifLink: { flexDirection: "row", alignItems: "center", gap: 8 },
  notifText: { fontSize: 14, fontWeight: "500", color: colors.text },
  signOut: { fontSize: 13, color: colors.textMuted, textDecorationLine: "underline" },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  badgeText: { color: colors.primaryText, fontSize: 11, fontWeight: "600" },
  orgCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.card,
    padding: 14,
  },
  orgType: { fontSize: 11, fontWeight: "600", letterSpacing: 0.5, color: colors.textMuted, textTransform: "uppercase" },
  orgName: { fontSize: 16, fontWeight: "600", color: colors.text, marginTop: 2 },
  empty: { fontSize: 14, color: colors.textMuted, textAlign: "center", marginTop: 12 },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.card,
    padding: 16,
    gap: 10,
  },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: "600", color: colors.text, flexShrink: 1 },
  reviewBadge: { backgroundColor: colors.amberBg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  reviewBadgeText: { fontSize: 11, fontWeight: "600", color: colors.amber },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: colors.primary },
  statsRow: { flexDirection: "row", justifyContent: "space-between" },
  statLabel: { fontSize: 11, color: colors.textMuted },
  statValue: { fontSize: 13, fontWeight: "600", color: colors.text, marginTop: 2 },
});
