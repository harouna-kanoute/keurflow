import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { entranceAnimation, useStyles, useTheme, type Theme } from "../../theme";
import { UploadPhotoSheet } from "./upload-photo-sheet";
import type { ProjectDetailState } from "./types";

export function PhotosTab({
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
  const [pickedAsset, setPickedAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const { photos, currentUserId, canManageAny } = state;

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (!result.canceled && result.assets[0]) setPickedAsset(result.assets[0]);
  };

  const deletePhoto = async (photoId: string, storagePath: string) => {
    // RLS (photos_delete_own_or_managers) is the authoritative check — this
    // icon is only shown per the same canManageAny/uploader gate web uses.
    const { error } = await supabase.from("photos").delete().eq("id", photoId);
    if (!error) {
      // Best-effort, mirrors web's deletePhoto action: storage RLS is
      // role-gated and narrower than the row policy above, so this can fail
      // for a plain member deleting their own upload — the row is already
      // gone either way.
      await supabase.storage.from("project-photos").remove([storagePath]);
    }
    onChanged();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Photos</Text>
        {!isBlocked && (
          <Pressable
            style={styles.addButton}
            onPress={pickPhoto}
            accessibilityRole="button"
            accessibilityLabel="Ajouter une photo"
          >
            <Ionicons name="add" size={18} color={styles.addButtonIcon.color} />
          </Pressable>
        )}
      </View>

      {photos.length === 0 && <Text style={styles.empty}>Aucune photo.</Text>}

      <View style={styles.grid}>
        {photos.map((photo, index) => {
          const canDelete = !isBlocked && (canManageAny || photo.uploaded_by === currentUserId);
          return (
            <Animated.View
              key={photo.id}
              entering={entranceAnimation(theme.reducedMotion, {
                index,
                maxStaggerIndex: 12,
                stepMs: 30,
                duration: 250,
              })}
              style={styles.tile}
            >
              {photo.signedUrl && (
                <Image source={{ uri: photo.signedUrl }} style={styles.image} resizeMode="cover" />
              )}
              {canDelete && (
                <Pressable
                  style={styles.deleteButton}
                  onPress={() => deletePhoto(photo.id, photo.storage_path)}
                  accessibilityRole="button"
                  accessibilityLabel="Supprimer la photo"
                >
                  <Ionicons name="trash-outline" size={14} color="#ffffff" />
                </Pressable>
              )}
            </Animated.View>
          );
        })}
      </View>

      <UploadPhotoSheet
        visible={pickedAsset !== null}
        onClose={() => setPickedAsset(null)}
        onUploaded={onChanged}
        projectId={projectId}
        asset={pickedAsset}
      />
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
    grid: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: theme.spacing.sm },
    tile: {
      width: "31.5%" as const,
      aspectRatio: 1,
      borderRadius: theme.radius.sm,
      overflow: "hidden" as const,
      backgroundColor: theme.colors.border,
    },
    image: { width: "100%" as const, height: "100%" as const },
    deleteButton: {
      position: "absolute" as const,
      top: 4,
      right: 4,
      width: 24,
      height: 24,
      borderRadius: theme.radius.full,
      backgroundColor: "rgba(0,0,0,0.55)",
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
  };
}
