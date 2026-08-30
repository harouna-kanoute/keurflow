import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { Badge } from "../../components/badge";
import { Card } from "../../components/card";
import { entranceAnimation, useStyles, useTheme, type Theme } from "../../theme";
import { AddMilestoneSheet } from "./add-milestone-sheet";
import { MilestoneStatusSheet } from "./milestone-status-sheet";
import { MILESTONE_LABELS, MILESTONE_TONES } from "./status-labels";
import type { Milestone, ProjectDetailState } from "./types";

const MAX_STAGGER_INDEX = 8;
const STAGGER_STEP_MS = 50;

export function EtapesTab({
  state,
  projectId,
  onChanged,
  isBlocked,
}: {
  state: Extract<ProjectDetailState, { status: "ready" }>;
  projectId: string;
  onChanged: () => void;
  isBlocked: boolean;
}) {
  const theme = useTheme();
  const styles = useStyles(createStyles);
  const [addOpen, setAddOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<Milestone | null>(null);
  const { milestones } = state;
  const nextOrderIndex = milestones.length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Étapes</Text>
        {!isBlocked && (
          <Pressable
            style={styles.addButton}
            onPress={() => setAddOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Ajouter une étape"
          >
            <Ionicons name="add" size={18} color={styles.addButtonIcon.color} />
          </Pressable>
        )}
      </View>

      {milestones.length === 0 && <Text style={styles.empty}>Aucune étape.</Text>}

      <Card style={styles.listCard}>
        {milestones.map((m, index) => (
          <Animated.View
            key={m.id}
            entering={entranceAnimation(theme.reducedMotion, {
              index,
              maxStaggerIndex: MAX_STAGGER_INDEX,
              stepMs: STAGGER_STEP_MS,
              duration: 250,
            })}
            style={styles.row}
          >
            <Text style={styles.rowText}>{m.name}</Text>
            <Pressable onPress={() => setStatusTarget(m)} disabled={isBlocked}>
              <Badge label={MILESTONE_LABELS[m.status] ?? m.status} tone={MILESTONE_TONES[m.status] ?? "neutral"} />
            </Pressable>
          </Animated.View>
        ))}
      </Card>

      <AddMilestoneSheet
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={onChanged}
        projectId={projectId}
        nextOrderIndex={nextOrderIndex}
      />
      {statusTarget && (
        <MilestoneStatusSheet
          visible
          onClose={() => setStatusTarget(null)}
          onChanged={onChanged}
          milestoneId={statusTarget.id}
          currentStatus={statusTarget.status}
        />
      )}
    </View>
  );
}

function createStyles(theme: Theme) {
  return {
    container: { gap: theme.spacing.md },
    header: { flexDirection: "row" as const, justifyContent: "space-between" as const, alignItems: "center" as const },
    title: { fontSize: 16, fontWeight: "700" as const, color: theme.colors.text },
    addButton: {
      width: 32,
      height: 32,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primary,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    addButtonIcon: { color: theme.colors.primaryText },
    empty: { fontSize: 13, color: theme.colors.textMuted, textAlign: "center" as const, marginTop: 12 },
    listCard: { gap: 0, padding: 0, overflow: "hidden" as const },
    row: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    rowText: { fontSize: 14, color: theme.colors.text, flexShrink: 1 },
  };
}
