import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Image, Linking, Pressable, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { Card } from "../../components/card";
import { supabase } from "../../lib/supabase";
import { entranceAnimation, useStyles, useTheme, type Theme } from "../../theme";
import { MemberProfileSheet } from "./member-profile-sheet";
import { PROJECT_ROLE_LABELS } from "./status-labels";
import type { Member, ProjectDetailState } from "./types";

// Same fallback as billing.tsx/profile.tsx.
const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? "https://keurflow.com";

const MAX_STAGGER_INDEX = 8;
const STAGGER_STEP_MS = 50;

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

// Edit-role stays deferred — inviting a brand-new person still deep-links to
// the web dashboard: creating their auth.users row (or looking one up by
// email) needs the Supabase service-role key, which never ships in the app
// bundle, same constraint as account deletion in profile.tsx. Removing an
// existing member/pending invite doesn't need that — it's a plain
// project_members delete, same as web's removeProjectMember.
export function EquipeTab({
  state,
  projectId,
  onChanged,
}: {
  state: Extract<ProjectDetailState, { status: "ready" }>;
  projectId: string;
  onChanged: () => void;
}) {
  const theme = useTheme();
  const styles = useStyles(createStyles);
  const [selected, setSelected] = useState<Member | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const { members, canManageAny } = state;

  // RLS (project_members_manage) is the authoritative check — the owner's
  // own row is never removable from here, matching web's removeProjectMember.
  const removeMember = async (member: Member) => {
    setRemovingId(member.id);
    const { error } = await supabase.from("project_members").delete().eq("id", member.id);
    if (error) console.error("[removeMember] Supabase error:", error.code, error.message);
    setRemovingId(null);
    onChanged();
  };

  return (
    <View style={styles.container}>
      <View style={styles.topHeader}>
        <Text style={styles.title}>Équipe</Text>
        <Pressable
          style={styles.inviteButton}
          onPress={() => Linking.openURL(`${WEB_URL}/dashboard/projects/${projectId}`)}
          accessibilityRole="button"
        >
          <Ionicons name="person-add-outline" size={15} color={styles.inviteIcon.color} />
          <Text style={styles.inviteLabel}>Inviter</Text>
        </Pressable>
      </View>

      {members.length === 0 && <Text style={styles.empty}>Aucun membre.</Text>}

      <Card style={styles.listCard}>
        {members.map((m, index) => (
          <Animated.View
            key={m.id}
            entering={entranceAnimation(theme.reducedMotion, {
              index,
              maxStaggerIndex: MAX_STAGGER_INDEX,
              stepMs: STAGGER_STEP_MS,
              duration: 250,
            })}
          >
            <View style={styles.row}>
              <Pressable style={styles.rowMain} onPress={() => setSelected(m)}>
                {m.avatarSignedUrl ? (
                  <Image source={{ uri: m.avatarSignedUrl }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarFallbackText}>{initialsFor(m.fullName)}</Text>
                  </View>
                )}
                <View style={styles.rowText}>
                  <Text style={styles.name} numberOfLines={1}>
                    {m.fullName}
                    {m.status === "invited" ? " (invité·e)" : ""}
                  </Text>
                  <Text style={styles.role}>{PROJECT_ROLE_LABELS[m.role] ?? m.role}</Text>
                </View>
              </Pressable>
              {canManageAny && m.role !== "project_owner" && (
                <Pressable
                  style={styles.removeButton}
                  disabled={removingId === m.id}
                  onPress={() => removeMember(m)}
                  accessibilityRole="button"
                  accessibilityLabel={m.status === "invited" ? "Annuler l'invitation" : "Retirer du chantier"}
                >
                  <Ionicons name="close-circle-outline" size={20} color={styles.removeIcon.color} />
                </Pressable>
              )}
            </View>
          </Animated.View>
        ))}
      </Card>

      <MemberProfileSheet visible={selected !== null} onClose={() => setSelected(null)} member={selected} />
    </View>
  );
}

function createStyles(theme: Theme) {
  return {
    container: { gap: theme.spacing.md },
    topHeader: { flexDirection: "row" as const, justifyContent: "space-between" as const, alignItems: "center" as const },
    title: { fontSize: 16, fontWeight: "700" as const, color: theme.colors.text },
    inviteButton: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 6,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    inviteIcon: { color: theme.colors.primaryText },
    inviteLabel: { fontSize: 13, fontWeight: "600" as const, color: theme.colors.primaryText },
    empty: { fontSize: 13, color: theme.colors.textMuted, textAlign: "center" as const, marginTop: 12 },
    listCard: { gap: 0, padding: 0, overflow: "hidden" as const },
    row: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    rowMain: { flex: 1, flexDirection: "row" as const, alignItems: "center" as const, gap: theme.spacing.md },
    removeButton: { padding: 4 },
    removeIcon: { color: theme.colors.danger },
    avatar: { width: 40, height: 40, borderRadius: theme.radius.full },
    avatarFallback: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.brand[100],
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    avatarFallbackText: { fontSize: 14, fontWeight: "700" as const, color: theme.colors.brand[700] },
    rowText: { flexShrink: 1, gap: 1 },
    name: { fontSize: 14, fontWeight: "600" as const, color: theme.colors.text },
    role: { fontSize: 12, color: theme.colors.textMuted },
  };
}
