import { Pressable, ScrollView, Text } from "react-native";
import { PROJECT_TABS, type ProjectTabId } from "../features/project-detail/tab-ids";
import { useStyles, type Theme } from "../theme";

export function ProjectTabBar({
  active,
  onChange,
}: {
  active: ProjectTabId;
  onChange: (id: ProjectTabId) => void;
}) {
  const styles = useStyles(createStyles);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.container}
    >
      {PROJECT_TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={tab.label}
            style={[styles.pill, isActive && styles.pillActive]}
          >
            <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function createStyles(theme: Theme) {
  return {
    container: { flexGrow: 0 },
    row: { gap: theme.spacing.sm, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.sm },
    pill: {
      borderRadius: theme.radius.full,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 7,
    },
    pillActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    label: { fontSize: 13, fontWeight: "600" as const, color: theme.colors.textMuted },
    labelActive: { color: theme.colors.primaryText },
  };
}
