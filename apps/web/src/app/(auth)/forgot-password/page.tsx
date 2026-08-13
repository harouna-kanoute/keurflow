"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  requestPasswordResetSchema,
  type RequestPasswordResetInput,
} from "@keurflow/validation";
import { FormField } from "@/components/form-field";
import { SubmitButton } from "@/components/submit-button";
import { requestPasswordReset } from "../actions";

export default function ForgotPasswordPage() {
  const [isPending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RequestPasswordResetInput>({ resolver: zodResolver(requestPasswordResetSchema) });

  const onSubmit = handleSubmit((data) => {
    startTransition(async () => {
      await requestPasswordReset(data);
      setSent(true);
    });
  });

  if (sent) {
    return (
      <>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Vérifiez votre boîte mail
        </h1>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          Si un compte existe avec cet email, un lien de réinitialisation vient de vous être
          envoyé.
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
        Mot de passe oublié
      </h1>
      <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
        Recevez un lien pour réinitialiser votre mot de passe.
      </p>
      <form onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-5">
        <FormField
          id="email"
          label="Email"
          type="email"
          placeholder="vous@exemple.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <SubmitButton pending={isPending}>
          {isPending ? "Envoi…" : "Envoyer le lien"}
        </SubmitButton>
      </form>
      <Link
        href="/login"
        className="mt-6 inline-block text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
      >
        ← Retour à la connexion
      </Link>
    </>
  );
}
