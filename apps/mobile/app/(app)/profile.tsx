import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Image, ScrollView, Text, View } from "react-native";
import { Card } from "../../src/components/card";
import { supabase } from "../../src/lib/supabase";
import { useStyles, useTheme, type Theme } from "../../src/theme";

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

type State =
  | { status: "loading" }
  | { status: "ready"; fullName: string; email: string; phone: string | null; avatarSignedUrl: string | null };

// Read-only — web's Mon profil page (settings/page.tsx) also has edit forms
// for name/phone, email change, password change, and account deletion.
// Explicitly out of scope for mobile Phase 1.
export default function ProfileScreen() {
  const theme = useTheme();
  const styles = useStyles(createStyles);
  const [state, setState] = useState<State>({ status: "loading" });

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, avatar_url, phone")
      .eq("id", user.id)
      .maybeSingle();

    let avatarSignedUrl: string | null = null;
    if (profile?.avatar_url) {
      const { data: signed } = await supabase.storage
        .from("avatars")
        .createSignedUrl(profile.avatar_url, 3600);
      avatarSignedUrl = signed?.signedUrl ?? null;
    }

    setState({
      status: "ready",
      fullName: profile?.full_name ?? "Utilisateur",
      email: user.email ?? "",
      phone: profile?.phone ?? null,
      avatarSignedUrl,
    });
  }, []);

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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.avatarBlock}>
        {state.avatarSignedUrl ? (
          <Image source={{ uri: state.avatarSignedUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarFallbackText}>{initialsFor(state.fullName)}</Text>
          </View>
        )}
        <Text style={styles.name}>{state.fullName}</Text>
      </View>

      <Card style={styles.card}>
        <InfoRow label="Email" value={state.email} />
        <InfoRow label="Téléphone" value={state.phone ?? "Non renseigné"} last />
      </Card>
    </ScrollView>
  );
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const styles = useStyles(createStyles);
  return (
    <View style={[styles.infoRow, last ? { borderBottomWidth: 0 } : null]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function createStyles(theme: Theme) {
  return {
    container: { padding: theme.spacing.lg },
    center: {
      flex: 1,
      backgroundColor: theme.colors.background,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    avatarBlock: { alignItems: "center" as const, gap: theme.spacing.sm, marginBottom: theme.spacing.xl },
    avatar: { width: 72, height: 72, borderRadius: theme.radius.full },
    avatarFallback: {
      width: 72,
      height: 72,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.brand[100],
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    avatarFallbackText: { fontSize: 22, fontWeight: "700" as const, color: theme.colors.brand[700] },
    name: { fontSize: 17, fontWeight: "700" as const, color: theme.colors.text },
    card: { padding: 0, overflow: "hidden" as const },
    infoRow: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    infoLabel: { fontSize: 13, color: theme.colors.textMuted },
    infoValue: { fontSize: 13, fontWeight: "600" as const, color: theme.colors.text, flexShrink: 1 },
  };
}
