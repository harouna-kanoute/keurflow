"use client";

import { useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { createMilestoneSchema, type CreateMilestoneInput } from "@keurflow/validation";
import { FormField } from "@/components/form-field";
import { SubmitButton } from "@/components/submit-button";
import { useModalClose } from "@/components/modal";
import { createMilestone, updateMilestoneStatus } from "./actions";

const STATUS_LABELS: Record<string, string> = {
  pending: "À faire",
  in_progress: "En cours",
  completed: "Terminée",
  delayed: "En retard",
};

const STATUSES = ["pending", "in_progress", "completed", "delayed"] as const;

export interface MilestoneRow {
  id: string;
  name: string;
  status: string;
}

export function MilestoneStatusSelect({ milestone }: { milestone: MilestoneRow }) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      defaultValue={milestone.status}
      disabled={isPending}
      onChange={(e) => {
        const status = e.target.value as (typeof STATUSES)[number];
        startTransition(async () => {
          await updateMilestoneStatus({ milestoneId: milestone.id, status });
        });
      }}
      className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs text-stone-900 disabled:opacity-50 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
    >
      {STATUSES.map((status) => (
        <option key={status} value={status}>
          {STATUS_LABELS[status]}
        </option>
      ))}
    </select>
  );
}

export function AddMilestoneForm({
  projectId,
  nextOrderIndex,
}: {
  projectId: string;
  nextOrderIndex: number;
}) {
  const close = useModalClose();
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CreateMilestoneInput>({
    resolver: zodResolver(createMilestoneSchema),
    defaultValues: { projectId, orderIndex: nextOrderIndex },
  });

  const onSubmit = handleSubmit((data) => {
    startTransition(async () => {
      const result = await createMilestone(data);
      if (result?.error) {
        setError("root", { message: result.error });
        return;
      }
      reset({ projectId, orderIndex: nextOrderIndex + 1 });
      close();
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="mt-3 flex items-end gap-2">
      <input type="hidden" {...register("projectId")} />
      <input type="hidden" {...register("orderIndex", { valueAsNumber: true })} />
      <div className="flex-1">
        <FormField
          id="milestoneName"
          label="Nouvelle étape"
          placeholder="Ex : Enduit"
          error={errors.name?.message}
          {...register("name")}
        />
      </div>
      <SubmitButton pending={isPending}>Ajouter</SubmitButton>
      {errors.root && <p className="text-sm text-red-600">{errors.root.message}</p>}
    </form>
  );
}
