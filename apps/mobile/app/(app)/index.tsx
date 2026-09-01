import { isSubscriptionBlocked } from "@keurflow/business";
import type { SubscriptionStatus } from "@keurflow/types";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated from "react-native-reanimated";
import { Badge } from "../../src/components/badge";
import { Card } from "../../src/components/card";
import { Money } from "../../src/components/money";
import { ProgressBar } from "../../src/components/progress-bar";
import { TrialLockedBanner } from "../../src/components/trial-locked-banner";
import { useDrawer } from "../../src/lib/drawer-context";
import { minorUnitFor, loadProjectSummary, type ProjectSummary } from "../../src/lib/projectSummary";
import { supabase } from "../../src/lib/supabase";
import { entranceAnimation, useStyles, useTheme, type Theme } from "../../src/theme";

const ORGANIZATION_TYPE_LABELS: Record<string, string> = {
  individual: "Particulier",
  agency: "Agence immobilière",
  company: "Entreprise",
};

// Caps the stagger so a long project list doesn't take seconds to finish
// animating in.
const MAX_STAGGER_INDEX = 8;
const STAGGER_STEP_MS = 60;

type State =
  | { status: "loading" }
  | { status: "no-org" }
  | {
      status: "ready";
      orgName: string;
      orgType: string;
      projects: ProjectSummary[];
      isBlocked: boolean;
    };

export default function ProjectListScreen() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [unreadCount, setUnreadCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const theme = useTheme();
  const styles = useStyles(createStyles);
  const { open: openDrawer } = useDrawer();

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
    const [{ data: projects }, { data: subscription }] = await Promise.all([
      supabase
        .from("projects")
        .select("id, name, status, budget_minor, currency_code")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("subscriptions")
        .select("status, trial_ends_at, plan_code")
        .eq("organization_id", organization.id)
        .maybeSingle(),
    ]);

    const summaries = await Promise.all((projects ?? []).map(loadProjectSummary));

    setState({
      status: "ready",
      orgName: organization.name,
      orgType: organization.type,
      projects: summaries,
      isBlocked: subscription
        ? isSubscriptionBlocked(
            { status: subscription.status as SubscriptionStatus, trialEndsAt: subscription.trial_ends_at },
            subscription.plan_code,
          )
        : false,
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
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  const hero = (
    <Card variant="hero" style={styles.hero}>
      <View style={styles.heroTopRow}>
        <Text style={styles.heroTitle}>Mes chantiers</Text>
        <View style={styles.heroActions}>
          <Pressable onPress={openDrawer} style={styles.iconButton} accessibilityLabel="Ouvrir le menu">
            <Ionicons name="menu-outline" size={20} color="#ffffff" />
          </Pressable>
          <Pressable onPress={() => router.push("/notifications")} style={styles.iconButton}>
            <Ionicons name="notifications-outline" size={20} color="#ffffff" />
            {unreadCount > 0 && (
              <View style={styles.badgeDot}>
                <Text style={styles.badgeDotText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
              </View>
            )}
          </Pressable>
          <Pressable onPress={() => supabase.auth.signOut()} style={styles.iconButton}>
            <Ionicons name="log-out-outline" size={20} color="#ffffff" />
          </Pressable>
        </View>
      </View>
    </Card>
  );

  const header = (
    <View style={styles.header}>
      {hero}
      {state.status === "ready" && (
        <Card style={styles.orgCard}>
          <Text style={styles.orgType}>
            {ORGANIZATION_TYPE_LABELS[state.orgType] ?? state.orgType}
          </Text>
          <Text style={styles.orgName}>{state.orgName}</Text>
        </Card>
      )}
      {state.status === "ready" && state.isBlocked && (
        <View style={styles.bannerWrap}>
          <TrialLockedBanner />
        </View>
      )}
    </View>
  );

  if (state.status === "no-org") {
    return (
      <SafeAreaView style={styles.flex} edges={["top"]}>
        {header}
        <Text style={styles.empty}>
          Aucune organisation associée à votre compte. Créez-la depuis l'application web pour
          commencer.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.flex} edges={["top"]}>
      <FlatList
        style={styles.flex}
        contentContainerStyle={styles.list}
        data={state.projects}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        ListEmptyComponent={<Text style={styles.empty}>Aucun chantier créé.</Text>}
        renderItem={({ item, index }) => {
          const minorUnit = minorUnitFor(item.currency_code);
          return (
            <Animated.View
              entering={entranceAnimation(theme.reducedMotion, {
                index,
                maxStaggerIndex: MAX_STAGGER_INDEX,
                stepMs: STAGGER_STEP_MS,
                duration: 400,
              })}
            >
              <Card onPress={() => router.push(`/projects/${item.id}`)} style={styles.projectCard}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  {item.toReviewCount > 0 && <Badge tone="amber" label={`${item.toReviewCount} à vérifier`} />}
                </View>
                <ProgressBar percent={item.progressPercent} />
                <View style={styles.statsRow}>
                  <View>
                    <Text style={styles.statLabel}>Budget</Text>
                    <Money
                      amountMinor={item.budget_minor}
                      currencyCode={item.currency_code}
                      minorUnit={minorUnit}
                      style={styles.statValue}
                    />
                  </View>
                  <View>
                    <Text style={styles.statLabel}>Financé</Text>
                    <Money
                      amountMinor={item.funded}
                      currencyCode={item.currency_code}
                      minorUnit={minorUnit}
                      style={styles.statValue}
                    />
                  </View>
                  <View>
                    <Text style={styles.statLabel}>Dépensé</Text>
                    <Money
                      amountMinor={item.spent}
                      currencyCode={item.currency_code}
                      minorUnit={minorUnit}
                      style={styles.statValue}
                    />
                  </View>
                </View>
              </Card>
            </Animated.View>
          );
        }}
      />
    </SafeAreaView>
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
      padding: 24,
    },
    list: { padding: theme.spacing.lg, gap: theme.spacing.md },
    header: { marginBottom: theme.spacing.xs },
    hero: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
    heroTopRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
    },
    heroTitle: { ...theme.typography.title, color: "#ffffff" },
    heroActions: { flexDirection: "row" as const, gap: theme.spacing.sm },
    iconButton: {
      width: 36,
      height: 36,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.overlayOnPrimary,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    badgeDot: {
      position: "absolute" as const,
      top: -2,
      right: -2,
      minWidth: 16,
      height: 16,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.danger,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      paddingHorizontal: 3,
    },
    badgeDotText: { color: "#ffffff", fontSize: 9, fontWeight: "700" as const },
    orgCard: { marginTop: -theme.spacing.lg, marginHorizontal: theme.spacing.lg },
    bannerWrap: { marginTop: theme.spacing.md, marginHorizontal: theme.spacing.lg },
    orgType: { ...theme.typography.caption, color: theme.colors.textMuted },
    orgName: { fontSize: 16, fontWeight: "600" as const, color: theme.colors.text, marginTop: 2 },
    empty: { fontSize: 14, color: theme.colors.textMuted, textAlign: "center" as const, marginTop: 12 },
    projectCard: { gap: theme.spacing.sm + 2 },
    cardTop: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      gap: theme.spacing.sm,
    },
    cardTitle: { fontSize: 15, fontWeight: "600" as const, color: theme.colors.text, flexShrink: 1 },
    statsRow: { flexDirection: "row" as const, justifyContent: "space-between" as const },
    statLabel: { fontSize: 11, color: theme.colors.textMuted },
    statValue: { fontSize: 13, fontWeight: "600" as const, color: theme.colors.text, marginTop: 2 },
  };
}
