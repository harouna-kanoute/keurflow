"use client";

import { useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { createOrganizationSchema, type CreateOrganizationInput } from "@keurflow/validation";
import { COUNTRIES } from "@keurflow/config";
import { FormField } from "@/components/form-field";
import { FormSelect } from "@/components/form-select";
import { SubmitButton } from "@/components/submit-button";
import { createOrganization } from "./actions";

const ACTIVE_COUNTRIES = COUNTRIES.filter((c) => c.active);

export function CreateOrganizationForm() {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CreateOrganizationInput>({ resolver: zodResolver(createOrganizationSchema) });

  const onSubmit = handleSubmit((data) => {
    startTransition(async () => {
      const result = await createOrganization(data);
      if (result?.error) setError("root", { message: result.error });
    });
  });

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="mt-4 flex w-full max-w-sm flex-col gap-4 text-left"
    >
      <FormField
        id="orgName"
        label="Nom"
        placeholder="Ex : Maison familiale"
        error={errors.name?.message}
        {...register("name")}
      />
      <FormSelect
        id="orgType"
        label="Type"
        defaultValue="individual"
        error={errors.type?.message}
        {...register("type")}
      >
        <option value="individual">Particulier</option>
        <option value="agency">Agence immobilière</option>
        <option value="company">Entreprise</option>
      </FormSelect>
      <FormSelect
        id="orgCountry"
        label="Pays"
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
      {errors.root && <p className="text-sm text-red-600">{errors.root.message}</p>}
      <SubmitButton pending={isPending}>
        {isPending ? "Création…" : "Créer mon organisation"}
      </SubmitButton>
    </form>
  );
}
