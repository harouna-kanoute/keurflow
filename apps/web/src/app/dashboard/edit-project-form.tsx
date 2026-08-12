"use client";

import { useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { updateProjectSchema, type UpdateProjectInput } from "@keurflow/validation";
import { CURRENCIES } from "@keurflow/config";
import { FormField } from "@/components/form-field";
import { FormSelect } from "@/components/form-select";
import { SubmitButton } from "@/components/submit-button";
import { useModalClose } from "@/components/modal";
import { updateProject } from "./projects/[id]/actions";

const PROJECT_TYPES = [
  { value: "construction", label: "Construction" },
  { value: "renovation", label: "Rénovation" },
  { value: "extension", label: "Extension" },
  { value: "other", label: "Autre" },
];

function minorUnitFor(currencyCode: string): number {
  return CURRENCIES.find((c) => c.code === currencyCode)?.minorUnit ?? 2;
}

export function EditProjectForm({
  projectId,
  currencyCode,
  defaultValues,
}: {
  projectId: string;
  currencyCode: string;
  defaultValues: {
    name: string;
    projectType: string;
    budgetMinor: number;
    address: string | null;
    surfaceArea: number | null;
  };
}) {
  const close = useModalClose();
  const [isPending, startTransition] = useTransition();
  const minorUnit = minorUnitFor(currencyCode);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<UpdateProjectInput>({
    resolver: zodResolver(updateProjectSchema),
    defaultValues: {
      projectId,
      name: defaultValues.name,
      projectType: defaultValues.projectType,
      // The input displays major units (e.g. "10000.00"); setValueAs below
      // converts back to minor units at submit — same contract as
      // CreateProjectForm's budget field.
      budgetMinor: defaultValues.budgetMinor / 10 ** minorUnit,
      address: defaultValues.address ?? undefined,
      surfaceArea: defaultValues.surfaceArea ?? undefined,
    },
  });

  const onSubmit = handleSubmit((data) => {
    startTransition(async () => {
      const result = await updateProject(data);
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
      <input type="hidden" {...register("projectId")} />
      <FormField
        id="editProjectName"
        label="Nom du chantier"
        error={errors.name?.message}
        {...register("name")}
      />
      <FormSelect
        id="editProjectType"
        label="Type"
        defaultValue={defaultValues.projectType}
        error={errors.projectType?.message}
        {...register("projectType")}
      >
        {PROJECT_TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </FormSelect>
      <FormField
        id="editProjectBudget"
        label={`Budget (${currencyCode})`}
        type="number"
        min="0"
        step="1"
        error={errors.budgetMinor?.message}
        {...register("budgetMinor", {
          setValueAs: (v) =>
            v === "" || v == null ? 0 : Math.round(Number(v) * 10 ** minorUnit),
        })}
      />
      <FormField
        id="editProjectAddress"
        label="Adresse du chantier"
        error={errors.address?.message}
        {...register("address")}
      />
      <FormField
        id="editProjectSurfaceArea"
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
        {isPending ? "Enregistrement…" : "Enregistrer"}
      </SubmitButton>
    </form>
  );
}
