import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { supabase } from "../../src/lib/supabase";
import { useStyles, useTheme, type Theme } from "../../src/theme";

const TYPE_LABELS: Record<string, string> = {
  new_expense: "Nouvelle dépense",
  expense_needs_review: "Informations demandées",
  document_added: "Document ajouté",
  expense_approved: "Dépense approuvée",
  expense_rejected: "Dépense rejetée",
  milestone_completed: "Étape terminée",
  milestone_delayed: "Étape en retard",
  report_created: "Rapport généré",
  member_invited: "Membre invité",
};

type Notification = {
  id: string;
  project_id: string | null;
  type: string;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
};

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[] | null>(null);
  const theme = useTheme();
  const styles = useStyles(createStyles);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // RLS (notifications_select_own) already scopes this to the caller.
    const { data } = await supabase
      .from("notifications")
      .select("id, project_id, type, title, body, read_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    setNotifications(data ?? []);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev ? prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)) : prev,
    );
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
  }, []);

  const markAllRead = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setNotifications((prev) => (prev ? prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })) : prev));
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);
  }, []);

  if (notifications === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <FlatList
      style={styles.flex}
      contentContainerStyle={styles.list}
      data={notifications}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        unreadCount > 0 ? (
          <Pressable style={styles.markAllButton} onPress={markAllRead}>
            <Text style={styles.markAllText}>Tout marquer comme lu</Text>
          </Pressable>
        ) : null
      }
      ListEmptyComponent={<Text style={styles.empty}>Aucune notification pour l'instant.</Text>}
      renderItem={({ item }) => (
        <View style={[styles.card, !item.read_at && styles.cardUnread]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            {item.body && <Text style={styles.cardBody}>{item.body}</Text>}
            <Pressable
              disabled={!item.project_id}
              onPress={() => item.project_id && router.push(`/projects/${item.project_id}`)}
            >
              <Text style={styles.cardMeta}>
                {TYPE_LABELS[item.type] ?? item.type}
                {item.project_id ? " · Voir le chantier" : ""}
              </Text>
            </Pressable>
          </View>
          {!item.read_at && (
            <Pressable style={styles.readButton} onPress={() => markRead(item.id)}>
              <Text style={styles.readButtonText}>Marquer comme lu</Text>
            </Pressable>
          )}
        </View>
      )}
    />
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
    list: { padding: 16, gap: 8 },
    empty: { fontSize: 13, color: theme.colors.textMuted, textAlign: "center" as const, marginTop: 24 },
    markAllButton: {
      alignSelf: "flex-end" as const,
      borderWidth: 1,
      borderColor: theme.colors.borderStrong,
      borderRadius: theme.radius.full,
      paddingHorizontal: 14,
      paddingVertical: 6,
      marginBottom: 8,
    },
    markAllText: { fontSize: 13, fontWeight: "600" as const, color: theme.colors.text },
    card: {
      flexDirection: "row" as const,
      gap: 10,
      alignItems: "flex-start" as const,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.card,
      padding: 12,
    },
    cardUnread: { backgroundColor: theme.colors.unreadBg, borderColor: theme.colors.brand[300] },
    cardTitle: { fontSize: 14, fontWeight: "600" as const, color: theme.colors.text },
    cardBody: { fontSize: 13, color: theme.colors.textMuted, marginTop: 2 },
    cardMeta: { fontSize: 11, color: theme.colors.textMuted, marginTop: 6, textDecorationLine: "underline" as const },
    readButton: {
      borderWidth: 1,
      borderColor: theme.colors.borderStrong,
      borderRadius: theme.radius.full,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    readButtonText: { fontSize: 11, fontWeight: "600" as const, color: theme.colors.text },
  };
}
