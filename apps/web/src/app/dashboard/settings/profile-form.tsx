"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { updateProfileSchema, type UpdateProfileInput } from "@keurflow/validation";
import { FormField } from "@/components/form-field";
import { SubmitButton } from "@/components/submit-button";
import { updateProfile } from "./actions";

export function ProfileForm({ fullName }: { fullName: string }) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { fullName },
  });

  const onSubmit = handleSubmit((data) => {
    setSaved(false);
    startTransition(async () => {
      const result = await updateProfile(data);
      if (result?.error) {
        setError("root", { message: result.error });
        return;
      }
      setSaved(true);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <FormField
        id="fullName"
        label="Nom complet"
        error={errors.fullName?.message}
        {...register("fullName")}
      />
      {errors.root && <p className="text-sm text-red-600">{errors.root.message}</p>}
      {saved && <p className="text-sm text-green-600 dark:text-green-400">Profil mis à jour.</p>}
      <div>
        <SubmitButton pending={isPending}>
          {isPending ? "Enregistrement…" : "Enregistrer"}
        </SubmitButton>
      </div>
    </form>
  );
}
