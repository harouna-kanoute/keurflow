"use client";

import { useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { COUNTRIES } from "@keurflow/config";
import { createSupplierSchema, type CreateSupplierInput } from "@keurflow/validation";
import { FormField } from "@/components/form-field";
import { FormSelect } from "@/components/form-select";
import { FormTextarea } from "@/components/form-textarea";
import { SubmitButton } from "@/components/submit-button";
import { useModalClose } from "@/components/modal";
import { createSupplier, updateSupplier } from "./supplier-actions";

const ACTIVE_COUNTRIES = COUNTRIES.filter((c) => c.active);

export interface SupplierFormValues {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  countryCode: string;
  specialties: string | null;
  notes: string | null;
  status: "active" | "inactive";
}

// One form for both create and edit: the only difference is which action runs
// and whether the status select is shown (a supplier can only be deactivated
// once it exists).
export function SupplierForm({
  organizationId,
  supplier,
}: {
  organizationId: string;
  supplier?: SupplierFormValues;
}) {
  const close = useModalClose();
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<CreateSupplierInput>({
    resolver: zodResolver(createSupplierSchema),
    defaultValues: {
      organizationId,
      name: supplier?.name ?? "",
      contactName: supplier?.contactName ?? undefined,
      phone: supplier?.phone ?? undefined,
      whatsapp: supplier?.whatsapp ?? undefined,
      email: supplier?.email ?? undefined,
      address: supplier?.address ?? undefined,
      city: supplier?.city ?? undefined,
      countryCode: supplier?.countryCode ?? "",
      specialties: supplier?.specialties ?? undefined,
      notes: supplier?.notes ?? undefined,
    },
  });

  const onSubmit = handleSubmit((data) => {
    startTransition(async () => {
      const result = supplier
        ? await updateSupplier({ ...data, supplierId: supplier.id, status: supplier.status })
        : await createSupplier(data);

      if (result?.error) {
        setError("root", { message: result.error });
        return;
      }
      if (!supplier) reset({ organizationId, name: "", countryCode: "" });
      close();
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 text-left">
      <input type="hidden" {...register("organizationId")} />
      <FormField
        id="supplierName"
        label="Nom du fournisseur"
        placeholder="ABC Matériaux"
        error={errors.name?.message}
        {...register("name")}
      />
      <FormField
        id="supplierContactName"
        label="Personne de contact (optionnel)"
        error={errors.contactName?.message}
        {...register("contactName")}
      />
      <div className="grid grid-cols-2 gap-3">
        <FormField
          id="supplierPhone"
          label="Téléphone (optionnel)"
          placeholder="+221771234567"
          inputMode="tel"
          error={errors.phone?.message}
          {...register("phone")}
        />
        <FormField
          id="supplierWhatsapp"
          label="WhatsApp (optionnel)"
          placeholder="+221771234567"
          inputMode="tel"
          error={errors.whatsapp?.message}
          {...register("whatsapp")}
        />
      </div>
      <FormField
        id="supplierEmail"
        label="Email (optionnel)"
        type="email"
        error={errors.email?.message}
        {...register("email")}
      />
      <FormField
        id="supplierAddress"
        label="Adresse (optionnel)"
        error={errors.address?.message}
        {...register("address")}
      />
      <div className="grid grid-cols-2 gap-3">
        <FormField
          id="supplierCity"
          label="Ville (optionnel)"
          placeholder="Dakar"
          error={errors.city?.message}
          {...register("city")}
        />
        <FormSelect
          id="supplierCountry"
          label="Pays"
          defaultValue={supplier?.countryCode ?? ""}
          error={errors.countryCode?.message}
          {...register("countryCode")}
        >
          <option value="" disabled>
            Sélectionner
          </option>
          {ACTIVE_COUNTRIES.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name}
            </option>
          ))}
        </FormSelect>
      </div>
      <FormField
        id="supplierSpecialties"
        label="Spécialités (optionnel)"
        placeholder="ciment, fer, matériaux de construction"
        error={errors.specialties?.message}
        {...register("specialties")}
      />
      <FormTextarea
        id="supplierNotes"
        label="Notes (optionnel)"
        error={errors.notes?.message}
        {...register("notes")}
      />
      {errors.root && <p className="text-sm text-red-600">{errors.root.message}</p>}
      <SubmitButton pending={isPending}>
        {isPending ? "Enregistrement…" : supplier ? "Enregistrer" : "Ajouter le fournisseur"}
      </SubmitButton>
    </form>
  );
}
