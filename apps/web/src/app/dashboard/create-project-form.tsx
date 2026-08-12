"use client";

import { useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { createProjectSchema, type CreateProjectInput } from "@keurflow/validation";
import { COUNTRIES, CURRENCIES } from "@keurflow/config";
import { FormField } from "@/components/form-field";
import { FormSelect } from "@/components/form-select";
import { SubmitButton } from "@/components/submit-button";
import { useModalClose } from "@/components/modal";
import { createProject } from "./actions";

const ACTIVE_COUNTRIES = COUNTRIES.filter((c) => c.active);

const PROJECT_TYPES = [
  { value: "construction", label: "Construction" },
  { value: "renovation", label: "Rénovation" },
  { value: "extension", label: "Extension" },
  { value: "other", label: "Autre" },
];

function minorUnitFor(currencyCode: string | undefined): number {
  return CURRENCIES.find((c) => c.code === currencyCode)?.minorUnit ?? 2;
}

export function CreateProjectForm({ organizationId }: { organizationId: string }) {
  const close = useModalClose();
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: { organizationId, projectType: "construction" },
  });

  const currencyCode = watch("currencyCode");

  const onSubmit = handleSubmit((data) => {
    startTransition(async () => {
      const result = await createProject(data);
      if (result?.error) {
        setError("root", { message: result.error });
        return;
      }
      close();
    });
  });

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="mt-4 flex w-full max-w-sm flex-col gap-4 text-left"
    >
      <input type="hidden" {...register("organizationId")} />
      <input type="hidden" {...register("currencyCode")} />
      <FormField
        id="projectName"
        label="Nom du chantier"
        placeholder="Ex : Construction maison familiale"
        error={errors.name?.message}
        {...register("name")}
      />
      <FormSelect
        id="projectType"
        label="Type"
        defaultValue="construction"
        error={errors.projectType?.message}
        {...register("projectType")}
      >
        {PROJECT_TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </FormSelect>
      <FormSelect
        id="projectCountry"
        label="Pays"
        defaultValue=""
        error={errors.countryCode?.message}
        {...register("countryCode", {
          onChange: (e) => {
            const country = ACTIVE_COUNTRIES.find((c) => c.code === e.target.value);
            if (country) setValue("currencyCode", country.currencyCode, { shouldValidate: true });
          },
        })}
      >
        <option value="" disabled>
          Sélectionner un pays
        </option>
        {ACTIVE_COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.name}
          </option>
        ))}
      </FormSelect>
      <FormField
        id="projectBudget"
        label={`Budget${currencyCode ? ` (${currencyCode})` : ""}`}
        type="number"
        min="0"
        step="1"
        error={errors.budgetMinor?.message}
        {...register("budgetMinor", {
          setValueAs: (v) =>
            v === "" || v == null ? 0 : Math.round(Number(v) * 10 ** minorUnitFor(currencyCode)),
        })}
      />
      <FormField
        id="projectAddress"
        label="Adresse du chantier"
        placeholder="Ex : 12 rue des Manguiers, Dakar"
        error={errors.address?.message}
        {...register("address")}
      />
      <FormField
        id="projectSurfaceArea"
        label="Superficie (m²)"
        type="number"
        min="0"
        step="0.01"
        error={errors.surfaceArea?.message}
        {...register("surfaceArea", {
          setValueAs: (v) => (v === "" || v == null ? undefined : Number(v)),
        })}
      />
      {errors.root && <p className="text-sm text-red-600">{errors.root.message}</p>}
      <SubmitButton pending={isPending}>
        {isPending ? "Création…" : "Créer le chantier"}
      </SubmitButton>
    </form>
  );
}
