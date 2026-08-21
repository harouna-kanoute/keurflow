"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  createExpenseSchema,
  MAX_UPLOAD_BYTES,
  type CreateExpenseInput,
  type UploadDocumentInput,
} from "@keurflow/validation";
import { EXPENSE_CATEGORIES } from "@keurflow/config";
import { createClient } from "@/lib/supabase/client";
import { FormField } from "@/components/form-field";
import { FormSelect } from "@/components/form-select";
import { SubmitButton } from "@/components/submit-button";
import { useModalClose } from "@/components/modal";
import { attachDocument, createExpense } from "./actions";

// Mirrors uploadDocumentSchema (packages/validation/src/document.ts) — the
// accept="" attribute below is only a UI hint, not enforcement, so this form
// needs its own check just like its sibling upload forms (avatar-upload.tsx,
// photos.tsx, create-support-ticket-form.tsx) already have.
const ALLOWED_RECEIPT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
];

export function CreateExpenseForm({
  projectId,
  currencyCode,
  minorUnit,
}: {
  projectId: string;
  currencyCode: string;
  minorUnit: number;
}) {
  const close = useModalClose();
  const [isPending, startTransition] = useTransition();
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    reset,
    formState: { errors },
  } = useForm<CreateExpenseInput>({
    resolver: zodResolver(createExpenseSchema),
    defaultValues: { projectId, currencyCode, category: "materials" },
  });

  const onSubmit = handleSubmit((data) => {
    if (!data.amountMinor) {
      setError("amountMinor", { message: "Montant requis" });
      return;
    }

    startTransition(async () => {
      const result = await createExpense(data);
      if (result.error) {
        setError("root", { message: result.error });
        return;
      }

      if (receiptFile) {
        const supabase = createClient();
        const path = `${projectId}/${result.expenseId}-${receiptFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from("expense-receipts")
          .upload(path, receiptFile);

        if (!uploadError) {
          await attachDocument({
            projectId,
            expenseId: result.expenseId,
            documentType: "receipt",
            storagePath: path,
            filename: receiptFile.name,
            mimeType: receiptFile.type as UploadDocumentInput["mimeType"],
            size: receiptFile.size,
          });
        }
      }

      reset({ projectId, currencyCode, category: "materials" });
      setReceiptFile(null);
      close();
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="mt-4 flex w-full flex-col gap-4 text-left">
      <input type="hidden" {...register("projectId")} />
      <input type="hidden" {...register("currencyCode")} />
      <FormField
        id="expenseAmount"
        label={`Montant (${currencyCode})`}
        type="number"
        min="0"
        step="1"
        error={errors.amountMinor?.message}
        {...register("amountMinor", {
          setValueAs: (v) =>
            v === "" || v == null ? undefined : Math.round(Number(v) * 10 ** minorUnit),
        })}
      />
      <FormSelect
        id="expenseCategory"
        label="Catégorie"
        defaultValue="materials"
        error={errors.category?.message}
        {...register("category")}
      >
        {EXPENSE_CATEGORIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.label}
          </option>
        ))}
      </FormSelect>
      <FormField
        id="expenseSupplier"
        label="Fournisseur (optionnel)"
        error={errors.supplierName?.message}
        {...register("supplierName")}
      />
      <FormField
        id="expenseDate"
        label="Date"
        type="date"
        error={errors.expenseDate?.message}
        {...register("expenseDate")}
      />
      <FormField
        id="expenseDescription"
        label="Description (optionnel)"
        error={errors.description?.message}
        {...register("description")}
      />
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="expenseReceipt"
          className="text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          Justificatif (optionnel)
        </label>
        <input
          id="expenseReceipt"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            if (file && (!ALLOWED_RECEIPT_TYPES.includes(file.type) || file.size > MAX_UPLOAD_BYTES)) {
              setError("root", {
                message: "Format ou taille de fichier non supporté (JPEG/PNG/WEBP/HEIC/PDF, 15 Mo max)",
              });
              e.target.value = "";
              setReceiptFile(null);
              return;
            }
            clearErrors("root");
            setReceiptFile(file);
          }}
          className="text-sm text-slate-700 dark:text-slate-300"
        />
      </div>
      {errors.root && <p className="text-sm text-red-600">{errors.root.message}</p>}
      <SubmitButton pending={isPending}>
        {isPending ? "Enregistrement…" : "Ajouter la dépense"}
      </SubmitButton>
    </form>
  );
}
