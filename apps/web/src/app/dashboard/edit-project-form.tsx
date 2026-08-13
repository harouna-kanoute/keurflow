"use client";

import { useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { updateProjectSchema, type UpdateProjectInput } from "@keurflow/validation";
import { CURRENCIES, PROJECT_TYPES } from "@keurflow/config";
import { FormField } from "@/components/form-field";
import { FormSelect } from "@/components/form-select";
import { FormTextarea } from "@/components/form-textarea";
import { SubmitButton } from "@/components/submit-button";
import { useModalClose } from "@/components/modal";
import { updateProject } from "./projects/[id]/actions";

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
    description: string | null;
    projectType: string;
    city: string | null;
    budgetMinor: number;
    address: string | null;
    surfaceArea: number | null;
    startDate: string | null;
    expectedEndDate: string | null;
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
      description: defaultValues.description ?? undefined,
      projectType: defaultValues.projectType,
      city: defaultValues.city ?? undefined,
      // The input displays major units (e.g. "10000.00"); setValueAs below
      // converts back to minor units at submit — same contract as
      // CreateProjectForm's budget field.
      budgetMinor: defaultValues.budgetMinor / 10 ** minorUnit,
      address: defaultValues.address ?? undefined,
      surfaceArea: defaultValues.surfaceArea ?? undefined,
      startDate: defaultValues.startDate ?? undefined,
      expectedEndDate: defaultValues.expectedEndDate ?? undefined,
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
      <FormTextarea
        id="editProjectDescription"
        label="Description (optionnel)"
        error={errors.description?.message}
        {...register("description")}
      />
      <FormSelect
        id="editProjectType"
        label="Type"
        defaultValue={defaultValues.projectType}
        error={errors.projectType?.message}
        {...register("projectType")}
      >
        {PROJECT_TYPES.map((t) => (
          <option key={t.code} value={t.code}>
            {t.label}
          </option>
        ))}
      </FormSelect>
      <FormField
        id="editProjectCity"
        label="Ville (optionnel)"
        error={errors.city?.message}
        {...register("city")}
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
      <div className="grid grid-cols-2 gap-3">
        <FormField
          id="editProjectStartDate"
          label="Début (optionnel)"
          type="date"
          error={errors.startDate?.message}
          {...register("startDate", { setValueAs: (v) => (v === "" ? undefined : v) })}
        />
        <FormField
          id="editProjectExpectedEndDate"
          label="Fin prévue (optionnel)"
          type="date"
          error={errors.expectedEndDate?.message}
          {...register("expectedEndDate", { setValueAs: (v) => (v === "" ? undefined : v) })}
        />
      </div>
      {errors.root && <p className="text-sm text-red-600">{errors.root.message}</p>}
      <SubmitButton pending={isPending}>
        {isPending ? "Enregistrement…" : "Enregistrer"}
      </SubmitButton>
    </form>
  );
}
