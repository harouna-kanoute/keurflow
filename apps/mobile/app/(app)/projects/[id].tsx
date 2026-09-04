import { useLocalSearchParams, useNavigation } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";
import { ProjectTabBar } from "../../../src/components/project-tab-bar";
import { ApercuTab } from "../../../src/features/project-detail/apercu-tab";
import { DepensesTab } from "../../../src/features/project-detail/depenses-tab";
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
        <Text style={styles.title}>{state.project.name}</Text>
        {state.project.city ? <Text style={styles.subtitle}>{state.project.city}</Text> : null}
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
    bannerWrap: { marginTop: theme.spacing.sm },
    title: { ...theme.typography.title, color: theme.colors.text },
    subtitle: { fontSize: 13, color: theme.colors.textMuted },
    container: { padding: theme.spacing.lg, gap: theme.spacing.md },
    empty: { fontSize: 13, color: theme.colors.textMuted, paddingVertical: 4 },
  };
}
