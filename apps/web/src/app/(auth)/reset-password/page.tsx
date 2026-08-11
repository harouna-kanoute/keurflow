"use client";

import { useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { updatePasswordSchema, type UpdatePasswordInput } from "@keurflow/validation";
import { FormField } from "@/components/form-field";
import { SubmitButton } from "@/components/submit-button";
import { updatePassword } from "../actions";

// Reached via the recovery email link, after /auth/callback exchanges the
// code and establishes a temporary session — never linked to directly.
export default function ResetPasswordPage() {
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
    <>
      <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-50">
        Choisir un nouveau mot de passe
      </h1>
      <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-4">
        <FormField
          id="password"
          label="Nouveau mot de passe"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register("password")}
        />
        <FormField
          id="confirmPassword"
          label="Confirmer le mot de passe"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />
        {errors.root && <p className="text-sm text-red-600">{errors.root.message}</p>}
        <SubmitButton pending={isPending}>
          {isPending ? "Mise à jour…" : "Mettre à jour le mot de passe"}
        </SubmitButton>
      </form>
    </>
  );
}
