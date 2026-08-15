"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  updatePasswordSchema,
  whatsappNumberSchema,
  type UpdatePasswordInput,
} from "@keurflow/validation";
import { FormField } from "@/components/form-field";
import { SubmitButton } from "@/components/submit-button";
import { updatePassword, setWhatsAppNumber } from "../actions";

// Invited collaborators land here straight from accepting their invite (see
// verifyEmailOtp's ?invite=1 redirect) — the one screen guaranteed to run
// exactly once, which makes it the natural place to also collect the
// WhatsApp number used later to reach them about a specific expense.
export function ResetPasswordForm({ invite }: { invite: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | undefined>();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<UpdatePasswordInput>({ resolver: zodResolver(updatePasswordSchema) });

  const onSubmit = handleSubmit((data) => {
    startTransition(async () => {
      if (invite) {
        const parsedPhone = whatsappNumberSchema.safeParse({ phone });
        if (!parsedPhone.success) {
          setPhoneError(parsedPhone.error.issues[0]?.message ?? "Numéro invalide");
          return;
        }
        setPhoneError(undefined);
        const phoneResult = await setWhatsAppNumber(parsedPhone.data);
        if (phoneResult?.error) {
          setError("root", { message: phoneResult.error });
          return;
        }
      }

      const result = await updatePassword(data);
      if (result?.error) setError("root", { message: result.error });
    });
  });

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
        {invite ? "Bienvenue sur KeurFlow" : "Choisir un nouveau mot de passe"}
      </h1>
      {invite && (
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Choisissez votre mot de passe et indiquez votre numéro WhatsApp — c&apos;est par là que
          les autres membres du chantier pourront vous contacter au sujet d&apos;une dépense.
        </p>
      )}
      <form onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-5">
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
        {invite && (
          <FormField
            id="phone"
            label="Numéro WhatsApp"
            type="tel"
            autoComplete="tel"
            placeholder="+221771234567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            error={phoneError}
          />
        )}
        {errors.root && <p className="text-sm text-red-600">{errors.root.message}</p>}
        <SubmitButton pending={isPending}>
          {isPending ? "Mise à jour…" : invite ? "Rejoindre le chantier" : "Mettre à jour le mot de passe"}
        </SubmitButton>
      </form>
    </>
  );
}
