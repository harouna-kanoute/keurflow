import { zodResolver } from "@hookform/resolvers/zod";
import { updatePasswordSchema, type UpdatePasswordInput } from "@keurflow/validation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Text } from "react-native";
import { FormInput } from "../../components/form-input";
import { PrimaryButton } from "../../components/primary-button";
import { SheetModal } from "../../components/sheet-modal";
import { supabase } from "../../lib/supabase";
import { useStyles, type Theme } from "../../theme";

const GENERIC_ERROR = "Une erreur est survenue. Veuillez réessayer.";

export function ChangePasswordSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const styles = useStyles(createStyles);
  const [pending, setPending] = useState(false);
  const [rootError, setRootError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdatePasswordInput>({ resolver: zodResolver(updatePasswordSchema) });

  const close = () => {
    reset();
    setRootError(null);
    setDone(false);
    onClose();
  };

  const onSubmit = handleSubmit(async (data) => {
    setPending(true);
    setRootError(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: data.password });
      if (error) {
        console.error("[changePassword] Supabase error:", error.code, error.message);
        setRootError(GENERIC_ERROR);
        return;
      }
      setDone(true);
    } catch (err) {
      console.error("[changePassword] unexpected error:", err);
      setRootError(GENERIC_ERROR);
    } finally {
      setPending(false);
    }
  });

  return (
    <SheetModal visible={visible} onClose={close} title="Changer le mot de passe">
      {done ? (
        <Text style={styles.success}>Mot de passe mis à jour.</Text>
      ) : (
        <>
          <FormInput
            control={control}
            name="password"
            label="Nouveau mot de passe"
            secureTextEntry
            autoComplete="new-password"
            error={errors.password?.message}
          />
          <FormInput
            control={control}
            name="confirmPassword"
            label="Confirmer le mot de passe"
            secureTextEntry
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
          />
          {rootError && <Text style={styles.error}>{rootError}</Text>}
          <PrimaryButton onPress={onSubmit} pending={pending}>
            {pending ? "Mise à jour…" : "Mettre à jour"}
          </PrimaryButton>
        </>
      )}
    </SheetModal>
  );
}

function createStyles(theme: Theme) {
  return {
    error: { fontSize: 13, color: theme.colors.danger },
    success: { fontSize: 14, color: theme.colors.success, textAlign: "center" as const },
  };
}
