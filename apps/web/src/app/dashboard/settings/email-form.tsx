"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { updateEmailSchema, type UpdateEmailInput } from "@keurflow/validation";
import { FormField } from "@/components/form-field";
import { SubmitButton } from "@/components/submit-button";
import { requestEmailChange } from "./actions";

export function EmailForm({ currentEmail }: { currentEmail: string }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<UpdateEmailInput>({
    resolver: zodResolver(updateEmailSchema),
    defaultValues: { email: currentEmail },
  });

  const onSubmit = handleSubmit((data) => {
    setMessage(null);
    startTransition(async () => {
      const result = await requestEmailChange(data);
      if (result?.error) {
        setError("root", { message: result.error });
        return;
      }
      setMessage(result.message ?? null);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <FormField
        id="email"
        label="Adresse email"
        type="email"
        error={errors.email?.message}
        {...register("email")}
      />
      {errors.root && <p className="text-sm text-red-600">{errors.root.message}</p>}
      {message && <p className="text-sm text-green-600 dark:text-green-400">{message}</p>}
      <div>
        <SubmitButton pending={isPending}>
          {isPending ? "Envoi…" : "Changer l'email"}
        </SubmitButton>
      </div>
    </form>
  );
}
