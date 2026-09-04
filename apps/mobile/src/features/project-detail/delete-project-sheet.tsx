import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { SheetModal } from "../../components/sheet-modal";
import { supabase } from "../../lib/supabase";
import { useStyles, type Theme } from "../../theme";

const GENERIC_ERROR = "Une erreur est survenue. Veuillez réessayer.";

// Mirrors web's DeleteProjectForm/deleteProject action: type-the-name
// confirmation, then best-effort storage cleanup (ON DELETE CASCADE only
// removes database rows, not the actual files) before deleting the row —
// RLS (projects_delete_org_admins_or_project_owners) is the real authority.
export function DeleteProjectSheet({
  visible,
  onClose,
  projectId,
  projectName,
}: {
  visible: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
}) {
  const styles = useStyles(createStyles);
  const [confirmText, setConfirmText] = useState("");
  const [pending, setPending] = useState(false);
  const [rootError, setRootError] = useState<string | null>(null);
  const canConfirm = confirmText.trim() === projectName;

  const onDelete = async () => {
    setPending(true);
    setRootError(null);

    const [{ data: photoRows }, { data: documentRows }, { data: fundingRows }] = await Promise.all([
      supabase.from("photos").select("storage_path").eq("project_id", projectId),
      supabase.from("documents").select("storage_path").eq("project_id", projectId),
      supabase.from("fundings").select("proof_url").eq("project_id", projectId).not("proof_url", "is", null),
    ]);

    const photoPaths = (photoRows ?? []).map((p) => p.storage_path);
    const documentPaths = (documentRows ?? []).map((d) => d.storage_path);
    const fundingPaths = (fundingRows ?? []).map((f) => f.proof_url).filter((p): p is string => !!p);

    const [photosResult, documentsResult, fundingsResult] = await Promise.all([
      photoPaths.length > 0 ? supabase.storage.from("project-photos").remove(photoPaths) : Promise.resolve({ error: null }),
      documentPaths.length > 0
        ? supabase.storage.from("expense-receipts").remove(documentPaths)
        : Promise.resolve({ error: null }),
      fundingPaths.length > 0
        ? supabase.storage.from("funding-proofs").remove(fundingPaths)
        : Promise.resolve({ error: null }),
    ]);
    for (const result of [photosResult, documentsResult, fundingsResult]) {
      if (result.error) console.error("[deleteProject] Storage cleanup error:", result.error.message);
    }

    const { error } = await supabase.from("projects").delete().eq("id", projectId);
    if (error) {
      console.error("[deleteProject] Supabase error:", error.code, error.message);
      setPending(false);
      setRootError(GENERIC_ERROR);
      return;
    }

    router.replace("/");
  };

  return (
    <SheetModal visible={visible} onClose={onClose} title="Supprimer le chantier">
      <Text style={styles.warning}>
        Cette action est irréversible. Elle supprime définitivement le chantier{" "}
        <Text style={styles.bold}>{projectName}</Text>, ainsi que tous ses financements, dépenses,
        documents, photos, étapes, membres et rapports.
      </Text>
      <View style={styles.field}>
        <Text style={styles.label}>Tapez « {projectName} » pour confirmer</Text>
        <TextInput
          style={styles.input}
          value={confirmText}
          onChangeText={setConfirmText}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      {rootError && <Text style={styles.error}>{rootError}</Text>}
      <Pressable
        onPress={onDelete}
        disabled={!canConfirm || pending}
        style={[styles.deleteButton, (!canConfirm || pending) && styles.deleteButtonDisabled]}
      >
        {pending ? (
          <ActivityIndicator color={styles.deleteButtonText.color} />
        ) : (
          <Text style={styles.deleteButtonText}>Supprimer définitivement</Text>
        )}
      </Pressable>
    </SheetModal>
  );
}

function createStyles(theme: Theme) {
  return {
    warning: { fontSize: 13, color: theme.colors.textMuted, lineHeight: 19 },
    bold: { fontWeight: "700" as const, color: theme.colors.text },
    field: { gap: 6 },
    label: { fontSize: 13, fontWeight: "500" as const, color: theme.colors.textMuted },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 15,
      color: theme.colors.text,
      backgroundColor: theme.colors.card,
    },
    error: { fontSize: 13, color: theme.colors.danger },
    deleteButton: {
      height: 44,
      borderRadius: theme.radius.full,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      backgroundColor: theme.colors.danger,
    },
    deleteButtonDisabled: { opacity: 0.5 },
    deleteButtonText: { color: "#ffffff", fontSize: 15, fontWeight: "600" as const },
  };
}
