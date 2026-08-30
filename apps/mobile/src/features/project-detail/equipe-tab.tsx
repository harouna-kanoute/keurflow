import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { Card } from "../../components/card";
import { entranceAnimation, useStyles, useTheme, type Theme } from "../../theme";
import { MemberProfileSheet } from "./member-profile-sheet";
import { PROJECT_ROLE_LABELS } from "./status-labels";
import type { Member, ProjectDetailState } from "./types";

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

// Read-only in Phase 1 — invite/edit-role/remove are deferred to Phase 2.
export function EquipeTab({ state }: { state: Extract<ProjectDetailState, { status: "ready" }> }) {
  const theme = useTheme();
  const styles = useStyles(createStyles);
  const [selected, setSelected] = useState<Member | null>(null);
  const { members } = state;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Équipe</Text>

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
            <Pressable style={styles.row} onPress={() => setSelected(m)}>
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
    title: { fontSize: 16, fontWeight: "700" as const, color: theme.colors.text },
    empty: { fontSize: 13, color: theme.colors.textMuted, textAlign: "center" as const, marginTop: 12 },
    listCard: { gap: 0, padding: 0, overflow: "hidden" as const },
    row: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
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
