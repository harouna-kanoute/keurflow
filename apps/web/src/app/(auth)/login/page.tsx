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
      <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-50">Se connecter</h1>
      <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-4">
        <FormField
          id="email"
          label="Email"
          type="email"
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
          {...register("password")}
        />
        {errors.root && <p className="text-sm text-red-600">{errors.root.message}</p>}
        <SubmitButton pending={isPending}>
          {isPending ? "Connexion…" : "Se connecter"}
        </SubmitButton>
      </form>
      <div className="mt-6 flex flex-col gap-2 text-sm text-stone-500 dark:text-stone-400">
        <Link href="/forgot-password" className="hover:text-stone-900 dark:hover:text-stone-100">
          Mot de passe oublié ?
        </Link>
        <p>
          Pas encore de compte ?{" "}
          <Link href="/signup" className="font-medium text-stone-900 underline dark:text-stone-100">
            Créer un compte
          </Link>
        </p>
      </div>
    </>
  );
}
