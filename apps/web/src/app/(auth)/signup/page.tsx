"use client";

import Link from "next/link";
import { useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { signUpSchema, type SignUpInput } from "@keurflow/validation";
import { COUNTRIES } from "@keurflow/config";
import { FormField } from "@/components/form-field";
import { FormSelect } from "@/components/form-select";
import { SubmitButton } from "@/components/submit-button";
import { signUp } from "../actions";

const ACTIVE_COUNTRIES = COUNTRIES.filter((c) => c.active);

export default function SignUpPage() {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SignUpInput>({ resolver: zodResolver(signUpSchema) });

  const onSubmit = handleSubmit((data) => {
    startTransition(async () => {
      const result = await signUp(data);
      if (result?.error) setError("root", { message: result.error });
    });
  });

  return (
    <>
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Créer un compte</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">7 jours gratuits, sans carte bancaire.</p>
      <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-4">
        <FormField
          id="fullName"
          label="Nom complet"
          autoComplete="name"
          error={errors.fullName?.message}
          {...register("fullName")}
        />
        <FormField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <FormSelect
          id="countryCode"
          label="Pays du projet"
          autoComplete="country"
          defaultValue=""
          error={errors.countryCode?.message}
          {...register("countryCode")}
        >
          <option value="" disabled>
            Sélectionner un pays
          </option>
          {ACTIVE_COUNTRIES.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name}
            </option>
          ))}
        </FormSelect>
        <FormField
          id="password"
          label="Mot de passe"
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
          {isPending ? "Création…" : "Créer mon compte"}
        </SubmitButton>
      </form>
      <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
        Déjà un compte ?{" "}
        <Link href="/login" className="font-medium text-slate-900 underline dark:text-slate-100">
          Se connecter
        </Link>
      </p>
    </>
  );
}
