import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { ProjectTabBar } from "../../../src/components/project-tab-bar";
import { ApercuTab } from "../../../src/features/project-detail/apercu-tab";
import { DeleteProjectSheet } from "../../../src/features/project-detail/delete-project-sheet";
import { DepensesTab } from "../../../src/features/project-detail/depenses-tab";
import { EditProjectSheet } from "../../../src/features/project-detail/edit-project-sheet";
import { EquipeTab } from "../../../src/features/project-detail/equipe-tab";
import { EtapesTab } from "../../../src/features/project-detail/etapes-tab";
import { FinancementsTab } from "../../../src/features/project-detail/financements-tab";
import { PhotosTab } from "../../../src/features/project-detail/photos-tab";
import { RapportsTab } from "../../../src/features/project-detail/rapports-tab";
import type { ProjectTabId } from "../../../src/features/project-detail/tab-ids";
import { useProjectDetail } from "../../../src/features/project-detail/use-project-detail";
import { TrialLockedBanner } from "../../../src/components/trial-locked-banner";
import { useStyles, useTheme, type Theme } from "../../../src/theme";

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const theme = useTheme();
  const styles = useStyles(createStyles);
  const [activeTab, setActiveTab] = useState<ProjectTabId>("apercu");
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { state, refreshing, onRefresh, reload } = useProjectDetail(id);

  useEffect(() => {
    if (state.status === "ready") navigation.setOptions({ title: state.project.name });
  }, [state, navigation]);

  if (state.status === "loading") {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (state.status === "not-found") {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>Chantier introuvable.</Text>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <View style={styles.headerBlock}>
        <View style={styles.titleRow}>
          <View style={styles.titleTextBlock}>
            <Text style={styles.title}>{state.project.name}</Text>
            {state.project.city ? <Text style={styles.subtitle}>{state.project.city}</Text> : null}
          </View>
          <View style={styles.titleActions}>
            {state.canEdit && (
              <Pressable
                style={styles.iconButton}
                onPress={() => setEditOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Modifier le chantier"
              >
                <Ionicons name="create-outline" size={18} color={styles.icon.color} />
              </Pressable>
            )}
            {state.canDelete && (
              <Pressable
                style={styles.iconButton}
                onPress={() => setDeleteOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Supprimer le chantier"
              >
                <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
              </Pressable>
            )}
          </View>
        </View>
        {state.isBlocked && (
          <View style={styles.bannerWrap}>
            <TrialLockedBanner />
          </View>
        )}
      </View>

      <ProjectTabBar active={activeTab} onChange={setActiveTab} />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
      >
        {activeTab === "apercu" && <ApercuTab state={state} />}
        {activeTab === "financements" && (
          <FinancementsTab
            state={state}
            projectId={state.project.id}
            onChanged={reload}
            isBlocked={state.isBlocked}
          />
        )}
        {activeTab === "depenses" && (
          <DepensesTab
            state={state}
            projectId={state.project.id}
            onChanged={reload}
            isBlocked={state.isBlocked}
          />
        )}
        {activeTab === "etapes" && (
          <EtapesTab
            state={state}
            projectId={state.project.id}
            onChanged={reload}
            isBlocked={state.isBlocked}
          />
        )}
        {activeTab === "photos" && (
          <PhotosTab
            state={state}
            projectId={state.project.id}
            onChanged={reload}
            isBlocked={state.isBlocked}
          />
        )}
        {activeTab === "equipe" && <EquipeTab state={state} projectId={state.project.id} />}
        {activeTab === "rapports" && (
          <RapportsTab
            state={state}
            projectId={state.project.id}
            onChanged={reload}
            isBlocked={state.isBlocked}
          />
        )}
      </ScrollView>

      <EditProjectSheet
        visible={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={reload}
        project={state.project}
      />
      <DeleteProjectSheet
        visible={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        projectId={state.project.id}
        projectName={state.project.name}
      />
    </View>
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
    headerBlock: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md, gap: 2 },
    titleRow: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "flex-start" as const,
      gap: theme.spacing.sm,
    },
    titleTextBlock: { flexShrink: 1, gap: 2 },
    titleActions: { flexDirection: "row" as const, gap: theme.spacing.sm },
    iconButton: {
      width: 32,
      height: 32,
      borderRadius: theme.radius.full,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    icon: { color: theme.colors.text },
    bannerWrap: { marginTop: theme.spacing.sm },
    title: { ...theme.typography.title, color: theme.colors.text },
    subtitle: { fontSize: 13, color: theme.colors.textMuted },
    container: { padding: theme.spacing.lg, gap: theme.spacing.md },
    empty: { fontSize: 13, color: theme.colors.textMuted, paddingVertical: 4 },
  };
}
