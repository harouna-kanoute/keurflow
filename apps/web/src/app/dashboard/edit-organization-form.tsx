"use client";

import { useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { updateOrganizationSchema, type UpdateOrganizationInput } from "@keurflow/validation";
import { FormField } from "@/components/form-field";
import { SubmitButton } from "@/components/submit-button";
import { useModalClose } from "@/components/modal";
import { updateOrganization } from "./actions";

export function EditOrganizationForm({
  defaultValues,
}: {
  defaultValues: UpdateOrganizationInput;
}) {
  const close = useModalClose();
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<UpdateOrganizationInput>({
    resolver: zodResolver(updateOrganizationSchema),
    defaultValues,
  });

  const onSubmit = handleSubmit((data) => {
    startTransition(async () => {
      const result = await updateOrganization(data);
      if (result?.error) {
        setError("root", { message: result.error });
        return;
      }
      close();
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="mt-3 flex flex-col gap-4">
      <input type="hidden" {...register("organizationId")} />
      <FormField id="orgEditName" label="Nom" error={errors.name?.message} {...register("name")} />
      <FormField
        id="orgEditAddress"
        label="Adresse"
        placeholder="Ex : Dakar, Sénégal"
        error={errors.address?.message}
        {...register("address", { setValueAs: (v) => (v === "" ? undefined : v) })}
      />
      <FormField
        id="orgEditPhone"
        label="Téléphone"
        type="tel"
        placeholder="+221771234567"
        error={errors.phone?.message}
        {...register("phone", { setValueAs: (v) => (v === "" ? undefined : v) })}
      />
      <FormField
        id="orgEditEmail"
        label="Email"
        type="email"
        placeholder="contact@exemple.com"
        error={errors.email?.message}
        {...register("email", { setValueAs: (v) => (v === "" ? undefined : v) })}
      />
      {errors.root && <p className="text-sm text-red-600">{errors.root.message}</p>}
      <SubmitButton pending={isPending}>{isPending ? "Enregistrement…" : "Enregistrer"}</SubmitButton>
    </form>
  );
}
