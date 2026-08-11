"use client";

import { useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { createReportSchema, type CreateReportInput } from "@keurflow/validation";
import { FormField } from "@/components/form-field";
import { SubmitButton } from "@/components/submit-button";
import { createReport } from "./actions";

export function CreateReportForm({ projectId }: { projectId: string }) {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CreateReportInput>({
    resolver: zodResolver(createReportSchema),
    defaultValues: { projectId },
  });

  const onSubmit = handleSubmit((data) => {
    startTransition(async () => {
      const result = await createReport(data);
      if (result?.error) {
        setError("root", { message: result.error });
        return;
      }
      reset({ projectId });
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="mt-3 flex flex-col gap-3">
      <input type="hidden" {...register("projectId")} />
      <div className="flex gap-3">
        <FormField
          id="reportPeriodStart"
          label="Début de période"
          type="date"
          error={errors.periodStart?.message}
          {...register("periodStart")}
        />
        <FormField
          id="reportPeriodEnd"
          label="Fin de période"
          type="date"
          error={errors.periodEnd?.message}
          {...register("periodEnd")}
        />
      </div>
      {errors.root && <p className="text-sm text-red-600">{errors.root.message}</p>}
      <SubmitButton pending={isPending}>
        {isPending ? "Génération…" : "Générer un rapport"}
      </SubmitButton>
    </form>
  );
}
