import { zodResolver } from "@hookform/resolvers/zod";
import { updateProfileSchema, type UpdateProfileInput } from "@keurflow/validation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Text } from "react-native";
import { FormInput } from "../../components/form-input";
import { PrimaryButton } from "../../components/primary-button";
import { SheetModal } from "../../components/sheet-modal";
import { supabase } from "../../lib/supabase";
import { useStyles, type Theme } from "../../theme";

const GENERIC_ERROR = "Une erreur est survenue. Veuillez réessayer.";

export function EditProfileSheet({
  visible,
  onClose,
  onSaved,
  fullName,
  phone,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  fullName: string;
  phone: string | null;
}) {
  const styles = useStyles(createStyles);
  const [pending, setPending] = useState(false);
  const [rootError, setRootError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { fullName, phone: phone ?? undefined },
  });

  // Re-sync whenever the sheet is (re)opened with the latest saved values —
  // otherwise a second open after a first edit would still show stale
  // defaultValues from the initial mount.
  useEffect(() => {
    if (visible) reset({ fullName, phone: phone ?? undefined });
  }, [visible, fullName, phone, reset]);

  const onSubmit = handleSubmit(async (data) => {
    setPending(true);
    setRootError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setRootError(GENERIC_ERROR);
        return;
      }

      // RLS (profiles_update_own) is the authoritative check — can only ever
      // touch the caller's own row.
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: data.fullName, phone: data.phone ?? null })
        .eq("id", user.id);

      if (error) {
        console.error("[editProfile] Supabase error:", error.code, error.message);
        setRootError(GENERIC_ERROR);
        return;
      }

      onSaved();
      onClose();
    } catch (err) {
      console.error("[editProfile] unexpected error:", err);
      setRootError(GENERIC_ERROR);
    } finally {
      setPending(false);
    }
  });

  return (
    <SheetModal visible={visible} onClose={onClose} title="Modifier le profil">
      <FormInput
        control={control}
        name="fullName"
        label="Nom complet"
        autoComplete="name"
        error={errors.fullName?.message}
      />
      <FormInput
        control={control}
        name="phone"
        label="Téléphone (WhatsApp)"
        keyboardType="phone-pad"
        autoComplete="tel"
        error={errors.phone?.message}
      />
      {rootError && <Text style={styles.error}>{rootError}</Text>}
      <PrimaryButton onPress={onSubmit} pending={pending}>
        {pending ? "Enregistrement…" : "Enregistrer"}
      </PrimaryButton>
    </SheetModal>
  );
}

function createStyles(theme: Theme) {
  return {
    error: { fontSize: 13, color: theme.colors.danger },
  };
}
