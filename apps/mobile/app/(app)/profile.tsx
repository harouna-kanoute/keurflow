import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { Card } from "../../src/components/card";
import { ChangePasswordSheet } from "../../src/features/profile/change-password-sheet";
import { EditProfileSheet } from "../../src/features/profile/edit-profile-sheet";
import { supabase } from "../../src/lib/supabase";
import { useStyles, useTheme, type Theme } from "../../src/theme";

// Same fallback as billing.tsx, for the same reason: the .vercel.app default
// domain stays behind Vercel Authentication, keurflow.com doesn't.
const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? "https://keurflow.com";

const GENERIC_ERROR = "Une erreur est survenue. Veuillez réessayer.";
// Mirrors web's avatar-upload.tsx ALLOWED_TYPES/MAX_BYTES exactly.
const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

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
  | {
      status: "ready";
      fullName: string;
      email: string;
      phone: string | null;
      avatarPath: string | null;
      avatarSignedUrl: string | null;
    };

// Account deletion needs the Supabase service-role key (cascading an
// auth.users row) — that key never ships in the app bundle, so it deep-links
// to the web app's settings page instead, same pattern as "Gérer
// l'abonnement" in billing.tsx.
export default function ProfileScreen() {
  const theme = useTheme();
  const styles = useStyles(createStyles);
  const [state, setState] = useState<State>({ status: "loading" });
  const [editOpen, setEditOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [avatarPending, setAvatarPending] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

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
      avatarPath: profile?.avatar_url ?? null,
      avatarSignedUrl,
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const changeAvatar = async () => {
    setAvatarError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const mimeType = asset.mimeType ?? "image/jpeg";
    if (!ALLOWED_AVATAR_TYPES.includes(mimeType) || (asset.fileSize ?? 0) > MAX_AVATAR_BYTES) {
      setAvatarError("Format ou taille de fichier non supporté (JPEG/PNG/WEBP, 5 Mo max)");
      return;
    }

    setAvatarPending(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setAvatarError(GENERIC_ERROR);
        return;
      }

      const filename = asset.fileName ?? `avatar-${Date.now()}.jpg`;
      const path = `${user.id}/${Date.now()}-${filename}`;
      const arrayBuffer = await (await fetch(asset.uri)).arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, arrayBuffer, { contentType: mimeType });

      if (uploadError) {
        console.error("[changeAvatar] upload error:", uploadError.message);
        setAvatarError(GENERIC_ERROR);
        return;
      }

      const previousPath = state.status === "ready" ? state.avatarPath : null;
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: path })
        .eq("id", user.id);

      if (error) {
        console.error("[changeAvatar] Supabase error:", error.code, error.message);
        setAvatarError(GENERIC_ERROR);
        return;
      }

      if (previousPath && previousPath !== path) {
        await supabase.storage.from("avatars").remove([previousPath]);
      }

      await load();
    } catch (err) {
      console.error("[changeAvatar] unexpected error:", err);
      setAvatarError(GENERIC_ERROR);
    } finally {
      setAvatarPending(false);
    }
  };

  const removeAvatar = async () => {
    setAvatarError(null);
    setAvatarPending(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setAvatarError(GENERIC_ERROR);
        return;
      }

      const previousPath = state.status === "ready" ? state.avatarPath : null;
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", user.id);

      if (error) {
        console.error("[removeAvatar] Supabase error:", error.code, error.message);
        setAvatarError(GENERIC_ERROR);
        return;
      }

      if (previousPath) {
        await supabase.storage.from("avatars").remove([previousPath]);
      }

      await load();
    } catch (err) {
      console.error("[removeAvatar] unexpected error:", err);
      setAvatarError(GENERIC_ERROR);
    } finally {
      setAvatarPending(false);
    }
  };

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
        <View style={styles.avatarActions}>
          <Pressable disabled={avatarPending} onPress={changeAvatar} accessibilityRole="button">
            <Text style={styles.avatarActionLabel}>{avatarPending ? "…" : "Changer la photo"}</Text>
          </Pressable>
          {state.avatarSignedUrl && (
            <Pressable disabled={avatarPending} onPress={removeAvatar} accessibilityRole="button">
              <Text style={[styles.avatarActionLabel, styles.dangerLabel]}>Retirer</Text>
            </Pressable>
          )}
        </View>
        {avatarError && <Text style={styles.error}>{avatarError}</Text>}
      </View>

      <Card style={styles.card}>
        <InfoRow label="Email" value={state.email} />
        <InfoRow label="Téléphone" value={state.phone ?? "Non renseigné"} last />
      </Card>

      <View style={styles.actions}>
        <Pressable style={styles.actionRow} onPress={() => setEditOpen(true)}>
          <Text style={styles.actionLabel}>Modifier le profil</Text>
        </Pressable>
        <Pressable style={styles.actionRow} onPress={() => setPasswordOpen(true)}>
          <Text style={styles.actionLabel}>Changer le mot de passe</Text>
        </Pressable>
        <Pressable
          style={[styles.actionRow, styles.actionRowLast]}
          onPress={() => Linking.openURL(`${WEB_URL}/dashboard/settings`)}
        >
          <Text style={[styles.actionLabel, styles.dangerLabel]}>Supprimer mon compte</Text>
        </Pressable>
      </View>
      <Text style={styles.deleteHint}>
        La suppression du compte se fait depuis l&apos;application web, pour votre sécurité.
      </Text>

      <EditProfileSheet
        visible={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={load}
        fullName={state.fullName}
        phone={state.phone}
      />
      <ChangePasswordSheet visible={passwordOpen} onClose={() => setPasswordOpen(false)} />
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
    avatarActions: { flexDirection: "row" as const, gap: theme.spacing.lg },
    avatarActionLabel: { fontSize: 13, fontWeight: "600" as const, color: theme.colors.primary },
    error: { fontSize: 12, color: theme.colors.danger, textAlign: "center" as const },
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
    actions: {
      marginTop: theme.spacing.lg,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
      overflow: "hidden" as const,
    },
    actionRow: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    actionRowLast: { borderBottomWidth: 0 },
    actionLabel: { fontSize: 14, fontWeight: "600" as const, color: theme.colors.text },
    dangerLabel: { color: theme.colors.danger },
    deleteHint: {
      marginTop: theme.spacing.sm,
      fontSize: 12,
      color: theme.colors.textMuted,
      textAlign: "center" as const,
    },
  };
}
