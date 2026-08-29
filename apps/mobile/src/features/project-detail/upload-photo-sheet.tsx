import { zodResolver } from "@hookform/resolvers/zod";
import { uploadPhotoSchema, type UploadPhotoInput } from "@keurflow/validation";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Text } from "react-native";
import { FormInput } from "../../components/form-input";
import { PrimaryButton } from "../../components/primary-button";
import { SheetModal } from "../../components/sheet-modal";
import { supabase } from "../../lib/supabase";
import { useStyles, type Theme } from "../../theme";

const GENERIC_ERROR = "Une erreur est survenue. Veuillez réessayer.";
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

export function UploadPhotoSheet({
  visible,
  onClose,
  onUploaded,
  projectId,
  asset,
}: {
  visible: boolean;
  onClose: () => void;
  onUploaded: () => void;
  projectId: string;
  asset: ImagePicker.ImagePickerAsset | null;
}) {
  const styles = useStyles(createStyles);
  const [pending, setPending] = useState(false);
  const [rootError, setRootError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UploadPhotoInput>({
    resolver: zodResolver(uploadPhotoSchema),
    defaultValues: { projectId, mimeType: "image/jpeg", size: 1 },
  });

  const onSubmit = handleSubmit(async (data) => {
    if (!asset) return;

    const mimeType = asset.mimeType ?? "image/jpeg";
    if (!ALLOWED_TYPES.includes(mimeType) || (asset.fileSize ?? 0) > 15 * 1024 * 1024) {
      setRootError("Format ou taille de fichier non supporté (JPEG/PNG/WEBP/HEIC, 15 Mo max)");
      return;
    }

    setPending(true);
    setRootError(null);

    try {
      const filename = asset.fileName ?? `photo-${Date.now()}.jpg`;
      const path = `${projectId}/${Date.now()}-${filename}`;
      const arrayBuffer = await (await fetch(asset.uri)).arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from("project-photos")
        .upload(path, arrayBuffer, { contentType: mimeType });

      if (uploadError) {
        setRootError(GENERIC_ERROR);
        return;
      }

      // RLS (project_photos_insert) is the authoritative check.
      await supabase
        .from("photos")
        .insert({ project_id: projectId, storage_path: path, caption: data.caption ?? null });

      reset({ projectId, mimeType: "image/jpeg", size: 1 });
      onUploaded();
      onClose();
    } catch {
      setRootError(GENERIC_ERROR);
    } finally {
      setPending(false);
    }
  });

  return (
    <SheetModal visible={visible} onClose={onClose} title="Ajouter une photo">
      <FormInput
        control={control}
        name="caption"
        label="Légende (optionnel)"
        error={errors.caption?.message}
      />
      {rootError && <Text style={styles.error}>{rootError}</Text>}
      <PrimaryButton onPress={onSubmit} pending={pending}>
        {pending ? "Envoi…" : "Envoyer"}
      </PrimaryButton>
    </SheetModal>
  );
}

function createStyles(theme: Theme) {
  return {
    error: { fontSize: 13, color: theme.colors.danger },
  };
}
