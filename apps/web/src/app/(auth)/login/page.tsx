"use client";

import Link from "next/link";
import { useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { signInSchema, type SignInInput } from "@keurflow/validation";
import { FormField } from "@/components/form-field";
import { SubmitButton } from "@/components/submit-button";
import { signIn } from "../actions";

export default function LoginPage() {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SignInInput>({ resolver: zodResolver(signInSchema) });

  const onSubmit = handleSubmit((data) => {
    startTransition(async () => {
      const result = await signIn(data);
      if (result?.error) setError("root", { message: result.error });
    });
  });

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
        Content de vous revoir 👋
      </h1>
      <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
        Connectez-vous pour retrouver vos chantiers.
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
        <FormField
          id="password"
          label="Mot de passe"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          labelAddon={
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
            >
              Mot de passe oublié ?
            </Link>
          }
          {...register("password")}
        />
        {errors.root && <p className="text-sm text-red-600">{errors.root.message}</p>}
        <SubmitButton pending={isPending}>
          {isPending ? (
            "Connexion…"
          ) : (
            <>
              Se connecter
              <span aria-hidden className="ml-2">
                →
              </span>
            </>
          )}
        </SubmitButton>
      </form>
      <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
        Pas encore de compte ?{" "}
        <Link href="/signup" className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
          Créer un compte
        </Link>
      </p>
    </>
  );
}
