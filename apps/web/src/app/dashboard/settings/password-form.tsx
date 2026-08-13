"use client";

import { useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { updatePasswordSchema, type UpdatePasswordInput } from "@keurflow/validation";
import { FormField } from "@/components/form-field";
import { SubmitButton } from "@/components/submit-button";
import { updatePassword } from "../../(auth)/actions";

// Reuses the same action as the recovery-link flow: Supabase's updateUser()
// only needs an active session (which a logged-in settings visit already
// has), it doesn't re-verify the current password. Redirects to /dashboard
// on success — there's no local "saved" state to show here.
export function PasswordForm() {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<UpdatePasswordInput>({ resolver: zodResolver(updatePasswordSchema) });

  const onSubmit = handleSubmit((data) => {
    startTransition(async () => {
      const result = await updatePassword(data);
      if (result?.error) setError("root", { message: result.error });
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <FormField
        id="newPassword"
        label="Nouveau mot de passe"
        type="password"
        autoComplete="new-password"
        error={errors.password?.message}
        {...register("password")}
      />
      <FormField
        id="confirmNewPassword"
        label="Confirmer le mot de passe"
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />
      {errors.root && <p className="text-sm text-red-600">{errors.root.message}</p>}
      <div>
        <SubmitButton pending={isPending}>
          {isPending ? "Mise à jour…" : "Mettre à jour le mot de passe"}
        </SubmitButton>
      </div>
    </form>
  );
}
