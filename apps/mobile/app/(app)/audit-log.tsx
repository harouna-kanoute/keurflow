import { hasOrgRoleAtLeast } from "@keurflow/business";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { Card } from "../../src/components/card";
import { useOrgMembership } from "../../src/features/navigation/use-org-membership";
import { supabase } from "../../src/lib/supabase";
import { useStyles, useTheme, type Theme } from "../../src/theme";

// Local-only label map, same pattern as web's own audit-log/page.tsx — not
// exported from packages/*. Falls back to the raw action string for any
// value not yet mapped (packages/types' AUDIT_ACTIONS is ahead of what the
// audit_logs table's own CHECK constraint currently allows).
const ACTION_LABELS: Record<string, string> = {
  project_created: "Chantier créé",
  member_invited: "Membre invité",
  expense_created: "Dépense ajoutée",
  expense_updated: "Dépense mise à jour",
  expense_approved: "Dépense approuvée",
  expense_rejected: "Dépense rejetée",
  document_uploaded: "Document ajouté",
  photo_uploaded: "Photo ajoutée",
  funding_created: "Financement enregistré",
  milestone_updated: "Étape mise à jour",
  comment_created: "Commentaire ajouté",
  report_created: "Rapport généré",
};

type Entry = { id: string; action: string; created_at: string; actorName: string };

type State = { status: "loading" } | { status: "forbidden" } | { status: "ready"; entries: Entry[] };

// Read-only, admin/owner-gated — mirrors web's audit-log/page.tsx exactly:
// hasOrgRoleAtLeast(role, "admin") is a UI convenience only, the real
// authority is the audit_logs_select_org_admins RLS policy (the query
// itself would return nothing for a non-admin regardless of this gate).
export default function AuditLogScreen() {
  const theme = useTheme();
  const styles = useStyles(createStyles);
  const { membership, loading: membershipLoading } = useOrgMembership();
  const [state, setState] = useState<State>({ status: "loading" });

  const load = useCallback(async () => {
    if (membershipLoading) return;
    if (!membership || !hasOrgRoleAtLeast(membership.role, "admin")) {
      setState({ status: "forbidden" });
      return;
    }

    const { data: entries } = await supabase
      .from("audit_logs")
      .select("id, action, user_id, created_at")
      .eq("organization_id", membership.organizationId)
      .order("created_at", { ascending: false })
      .limit(100);

    const userIds = [...new Set((entries ?? []).map((e) => e.user_id).filter((id): id is string => !!id))];
    const { data: profiles } =
      userIds.length > 0
        ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
        : { data: [] as { id: string; full_name: string | null }[] };
    const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? "Utilisateur"]));

    setState({
      status: "ready",
      entries: (entries ?? []).map((e) => ({
        id: e.id,
        action: e.action,
        created_at: e.created_at,
        actorName: e.user_id ? (nameById.get(e.user_id) ?? "Utilisateur") : "Système",
      })),
    });
  }, [membership, membershipLoading]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (state.status === "loading") {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (state.status === "forbidden") {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>
          Seuls les propriétaires et administrateurs peuvent consulter le journal d'activité.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.subtitle}>Les 100 dernières actions de votre organisation.</Text>

      {state.entries.length === 0 && <Text style={styles.empty}>Aucune activité pour le moment.</Text>}

      {state.entries.map((entry) => (
        <Card key={entry.id} style={styles.entryCard}>
          <View style={styles.entryTop}>
            <Text style={styles.entryAction}>{ACTION_LABELS[entry.action] ?? entry.action}</Text>
            <Text style={styles.entryDate}>{new Date(entry.created_at).toLocaleString("fr-FR")}</Text>
          </View>
          <Text style={styles.entryActor}>{entry.actorName}</Text>
        </Card>
      ))}
    </ScrollView>
  );
}

function createStyles(theme: Theme) {
  return {
    container: { padding: theme.spacing.lg, gap: theme.spacing.sm },
    center: {
      flex: 1,
      backgroundColor: theme.colors.background,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      padding: 24,
    },
    empty: { fontSize: 14, color: theme.colors.textMuted, textAlign: "center" as const, marginTop: 12 },
    subtitle: { fontSize: 13, color: theme.colors.textMuted, marginBottom: 4 },
    entryCard: { gap: 4, padding: theme.spacing.md },
    entryTop: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      gap: theme.spacing.sm,
    },
    entryAction: { fontSize: 13, fontWeight: "600" as const, color: theme.colors.text, flexShrink: 1 },
    entryDate: { fontSize: 11, color: theme.colors.textMuted },
    entryActor: { fontSize: 12, color: theme.colors.textMuted },
  };
}
