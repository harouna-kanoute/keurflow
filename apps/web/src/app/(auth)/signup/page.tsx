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
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { organizationType: "individual" },
  });

  const trialDays = 14;

  const onSubmit = handleSubmit((data) => {
    startTransition(async () => {
      const result = await signUp(data);
      if (result?.error) setError("root", { message: result.error });
    });
  });

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
        Créez votre compte
      </h1>
      <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-brand-900 dark:text-brand-300">
        {trialDays} jours gratuits · Sans carte bancaire
      </span>
      <form onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-5">
        <FormField
          id="fullName"
          label="Nom complet"
          placeholder="Amadou Diallo"
          autoComplete="name"
          error={errors.fullName?.message}
          {...register("fullName")}
        />
        <FormField
          id="email"
          label="Email"
          type="email"
          placeholder="vous@exemple.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <FormSelect
          id="organizationType"
          label="Vous êtes"
          defaultValue="individual"
          error={errors.organizationType?.message}
          {...register("organizationType")}
        >
          <option value="individual">Particulier</option>
          <option value="agency">Agence immobilière</option>
          <option value="company">Entreprise</option>
        </FormSelect>
        <FormSelect
          id="countryCode"
          label="Pays"
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
          placeholder="Au moins 8 caractères"
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
          {isPending ? (
            "Création…"
          ) : (
            <>
              Créer mon compte
              <span aria-hidden className="ml-2">
                →
              </span>
            </>
          )}
        </SubmitButton>
      </form>
      <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
        Déjà un compte ?{" "}
        <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
          Se connecter
        </Link>
      </p>
    </>
  );
}
