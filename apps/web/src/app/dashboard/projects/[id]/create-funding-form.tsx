"use client";

import { useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { createFundingSchema, type CreateFundingInput } from "@keurflow/validation";
import { PAYMENT_METHODS } from "@keurflow/config";
import { FormField } from "@/components/form-field";
import { FormSelect } from "@/components/form-select";
import { SubmitButton } from "@/components/submit-button";
import { createFunding } from "./actions";

const ACTIVE_PAYMENT_METHODS = PAYMENT_METHODS.filter((m) => m.active);

export function CreateFundingForm({
  projectId,
  currencyCode,
  minorUnit,
}: {
  projectId: string;
  currencyCode: string;
  minorUnit: number;
}) {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CreateFundingInput>({
    resolver: zodResolver(createFundingSchema),
    defaultValues: { projectId, currencyCode },
  });

  const onSubmit = handleSubmit((data) => {
    startTransition(async () => {
      const result = await createFunding(data);
      if (result?.error) setError("root", { message: result.error });
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="mt-4 flex w-full flex-col gap-4 text-left">
      <input type="hidden" {...register("projectId")} />
      <input type="hidden" {...register("currencyCode")} />
      <FormField
        id="fundingAmount"
        label={`Montant (${currencyCode})`}
        type="number"
        min="0"
        step="1"
        error={errors.amountMinor?.message}
        {...register("amountMinor", {
          setValueAs: (v) =>
            v === "" || v == null ? 0 : Math.round(Number(v) * 10 ** minorUnit),
        })}
      />
      <FormSelect
        id="fundingPaymentMethod"
        label="Moyen de paiement"
        defaultValue=""
        error={errors.paymentMethodCode?.message}
        {...register("paymentMethodCode")}
      >
        <option value="" disabled>
          Sélectionner
        </option>
        {ACTIVE_PAYMENT_METHODS.map((m) => (
          <option key={m.code} value={m.code}>
            {m.label}
          </option>
        ))}
      </FormSelect>
      <FormField
        id="fundingDate"
        label="Date"
        type="date"
        error={errors.fundingDate?.message}
        {...register("fundingDate")}
      />
      <FormField
        id="fundingReference"
        label="Référence (optionnel)"
        error={errors.reference?.message}
        {...register("reference")}
      />
      {errors.root && <p className="text-sm text-red-600">{errors.root.message}</p>}
      <SubmitButton pending={isPending}>
        {isPending ? "Enregistrement…" : "Ajouter le financement"}
      </SubmitButton>
    </form>
  );
}
