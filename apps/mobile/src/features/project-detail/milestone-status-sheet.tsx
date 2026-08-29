import { Pressable, Text } from "react-native";
import { SheetModal } from "../../components/sheet-modal";
import { supabase } from "../../lib/supabase";
import { useStyles, type Theme } from "../../theme";
import { MILESTONE_LABELS } from "./status-labels";

const STATUSES = ["pending", "in_progress", "completed", "delayed"] as const;

export function MilestoneStatusSheet({
  visible,
  onClose,
  onChanged,
  milestoneId,
  currentStatus,
}: {
  visible: boolean;
  onClose: () => void;
  onChanged: () => void;
  milestoneId: string;
  currentStatus: string;
}) {
  const styles = useStyles(createStyles);

  const setStatus = async (status: (typeof STATUSES)[number]) => {
    // Mirrors web's updateMilestoneStatus action exactly — completed_date is
    // set/cleared alongside the status, not exposed as its own field. RLS
    // (milestones_write_non_viewers) deliberately allows any non-viewer
    // collaborator to do this — a quick action from the field, not
    // manager-gated.
    await supabase
      .from("milestones")
      .update({
        status,
        completed_date: status === "completed" ? new Date().toISOString().slice(0, 10) : null,
      })
      .eq("id", milestoneId);
    onChanged();
    onClose();
  };

  return (
    <SheetModal visible={visible} onClose={onClose} title="Changer le statut">
      {STATUSES.map((status) => (
        <Pressable
          key={status}
          style={[styles.option, status === currentStatus && styles.optionActive]}
          onPress={() => setStatus(status)}
          accessibilityRole="button"
          accessibilityLabel={MILESTONE_LABELS[status]}
        >
          <Text style={styles.optionText}>{MILESTONE_LABELS[status]}</Text>
        </Pressable>
      ))}
    </SheetModal>
  );
}

function createStyles(theme: Theme) {
  return {
    option: {
      paddingVertical: 14,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radius.md,
    },
    // theme.colors.unreadBg is a subtle, already-theme-aware brand tint
    // (defined for notification rows) — reused here for the same "this one
    // is highlighted" need rather than a raw brand[100], which would be a
    // near-invisible light lavender against dark-mode's near-white text.
    optionActive: { backgroundColor: theme.colors.unreadBg },
    optionText: { fontSize: 15, color: theme.colors.text, fontWeight: "600" as const },
  };
}
