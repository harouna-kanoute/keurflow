import { zodResolver } from "@hookform/resolvers/zod";
import { createMilestoneSchema, type CreateMilestoneInput } from "@keurflow/validation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Text } from "react-native";
import { FormInput } from "../../components/form-input";
import { PrimaryButton } from "../../components/primary-button";
import { SheetModal } from "../../components/sheet-modal";
import { supabase } from "../../lib/supabase";
import { useStyles, type Theme } from "../../theme";

const GENERIC_ERROR = "Une erreur est survenue. Veuillez réessayer.";

export function AddMilestoneSheet({
  visible,
  onClose,
  onCreated,
  projectId,
  nextOrderIndex,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
  projectId: string;
  nextOrderIndex: number;
}) {
  const styles = useStyles(createStyles);
  const [pending, setPending] = useState(false);
  const [rootError, setRootError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateMilestoneInput>({
    resolver: zodResolver(createMilestoneSchema),
    defaultValues: { projectId, orderIndex: nextOrderIndex },
  });

  const onSubmit = handleSubmit(async (data) => {
    setPending(true);
    setRootError(null);

    // RLS (milestones_write_non_viewers) is the authoritative check.
    const { error } = await supabase.from("milestones").insert({
      project_id: projectId,
      name: data.name,
      order_index: nextOrderIndex,
    });

    setPending(false);
    if (error) {
      setRootError(GENERIC_ERROR);
      return;
    }

    reset({ projectId, orderIndex: nextOrderIndex });
    onCreated();
    onClose();
  });

  return (
    <SheetModal visible={visible} onClose={onClose} title="Ajouter une étape">
      <FormInput control={control} name="name" label="Nom de l'étape" error={errors.name?.message} />
      {rootError && <Text style={styles.error}>{rootError}</Text>}
      <PrimaryButton onPress={onSubmit} pending={pending}>
        {pending ? "Ajout…" : "Ajouter"}
      </PrimaryButton>
    </SheetModal>
  );
}

function createStyles(theme: Theme) {
  return {
    error: { fontSize: 13, color: theme.colors.danger },
  };
}
