"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { calculatePurchaseTotalMinor, formatMoney } from "@keurflow/business";
import { MATERIALS, PAYMENT_METHODS } from "@keurflow/config";
import { PURCHASE_UNITS } from "@keurflow/types";
import {
  createPurchaseSchema,
  MAX_UPLOAD_BYTES,
  type CreatePurchaseInput,
  type UploadDocumentInput,
} from "@keurflow/validation";
import { createClient } from "@/lib/supabase/client";
import { FormField } from "@/components/form-field";
import { FormSelect } from "@/components/form-select";
import { SubmitButton } from "@/components/submit-button";
import { useModalClose } from "@/components/modal";
import { attachDocument } from "./actions";
import { createPurchase } from "./supplier-actions";

// Same allow-list as the expense receipt upload — the accept="" attribute is
// only a UI hint, so the check is repeated here before anything is uploaded.
const ALLOWED_RECEIPT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
];

export interface PurchaseSupplierOption {
  id: string;
  name: string;
  status: "active" | "inactive";
}

export interface PurchaseExpenseOption {
  id: string;
  label: string;
}

export function PurchaseForm({
  projectId,
  currencyCode,
  minorUnit,
  suppliers,
  expenses,
}: {
  projectId: string;
  currencyCode: string;
  minorUnit: number;
  suppliers: PurchaseSupplierOption[];
  expenses: PurchaseExpenseOption[];
}) {
  const close = useModalClose();
  const [isPending, startTransition] = useTransition();
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const emptyPurchase = () => ({
    projectId,
    currencyCode,
    materialCode: "cement",
    unit: "sac",
    purchaseDate: new Date().toISOString().slice(0, 10),
  });

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<CreatePurchaseInput>({
    resolver: zodResolver(createPurchaseSchema),
    defaultValues: emptyPurchase(),
  });

  // A deactivated supplier is not offered for a new purchase (§16) — its
  // history stays readable, it just isn't proposed here anymore.
  const selectableSuppliers = suppliers.filter((s) => s.status === "active");
  const materialCode = watch("materialCode");
  const quantity = Number(watch("quantity")) || 0;
  const unitPriceMajor = Number(watch("unitPriceMinor")) || 0;

  // Live preview only. The server recomputes this from the same formula and
  // the database trigger recomputes it again — nothing here is trusted.
  const previewTotalMinor = calculatePurchaseTotalMinor({
    quantity,
    unitPriceMinor: Math.round(unitPriceMajor * 10 ** minorUnit),
  });

  const onSubmit = handleSubmit((data) => {
    startTransition(async () => {
      const result = await createPurchase(data);
      if (result.error) {
        setError("root", { message: result.error });
        return;
      }

      if (receiptFile) {
        const supabase = createClient();
        const path = `${projectId}/${result.purchaseId}-${receiptFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from("expense-receipts")
          .upload(path, receiptFile);

        if (!uploadError) {
          await attachDocument({
            projectId,
            purchaseId: result.purchaseId,
            documentType: "invoice",
            storagePath: path,
            filename: receiptFile.name,
            mimeType: receiptFile.type as UploadDocumentInput["mimeType"],
            size: receiptFile.size,
          });
        }
      }

      // The Modal is a native <dialog>: closing it hides the form but keeps it
      // mounted, so without this the next purchase would inherit this one's
      // description and payment method — and get saved with them.
      reset(emptyPurchase());
      setReceiptFile(null);
      close();
    });
  });

  if (selectableSuppliers.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Ajoutez d&apos;abord un fournisseur actif pour pouvoir enregistrer un achat.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 text-left">
      <input type="hidden" {...register("projectId")} />
      <input type="hidden" {...register("currencyCode")} />
      <FormSelect
        id="purchaseSupplier"
        label="Fournisseur"
        error={errors.supplierId?.message}
        {...register("supplierId")}
      >
        <option value="">Sélectionner</option>
        {selectableSuppliers.map((supplier) => (
          <option key={supplier.id} value={supplier.id}>
            {supplier.name}
          </option>
        ))}
      </FormSelect>
      <div className="grid grid-cols-2 gap-3">
        <FormSelect
          id="purchaseMaterial"
          label="Matériau"
          error={errors.materialCode?.message}
          {...register("materialCode")}
        >
          {MATERIALS.map((material) => (
            <option key={material.code} value={material.code}>
              {material.label}
            </option>
          ))}
        </FormSelect>
        <FormSelect id="purchaseUnit" label="Unité" error={errors.unit?.message} {...register("unit")}>
          {PURCHASE_UNITS.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </FormSelect>
      </div>
      {materialCode === "other" && (
        <FormField
          id="purchaseMaterialName"
          label="Nom du matériau"
          placeholder="Chaux"
          error={errors.materialName?.message}
          {...register("materialName")}
        />
      )}
      <div className="grid grid-cols-2 gap-3">
        <FormField
          id="purchaseQuantity"
          label="Quantité"
          type="number"
          min="0"
          step="any"
          error={errors.quantity?.message}
          {...register("quantity", { setValueAs: (v) => (v === "" ? undefined : Number(v)) })}
        />
        <FormField
          id="purchaseUnitPrice"
          label={`Prix unitaire (${currencyCode})`}
          type="number"
          min="0"
          step="any"
          error={errors.unitPriceMinor?.message}
          {...register("unitPriceMinor", {
            setValueAs: (v) =>
              v === "" || v == null ? undefined : Math.round(Number(v) * 10 ** minorUnit),
          })}
        />
      </div>
      <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
        <span className="text-sm text-slate-500 dark:text-slate-400">Montant total</span>
        <span className="text-base font-semibold text-slate-900 dark:text-slate-50">
          {formatMoney(previewTotalMinor, currencyCode, minorUnit)}
        </span>
      </div>
      <FormField
        id="purchaseDate"
        label="Date d'achat"
        type="date"
        error={errors.purchaseDate?.message}
        {...register("purchaseDate")}
      />
      <FormSelect
        id="purchasePaymentMethod"
        label="Moyen de paiement (optionnel)"
        error={errors.paymentMethodCode?.message}
        {...register("paymentMethodCode", { setValueAs: (v) => (v === "" ? undefined : v) })}
      >
        <option value="">Non précisé</option>
        {PAYMENT_METHODS.filter((m) => m.active).map((method) => (
          <option key={method.code} value={method.code}>
            {method.label}
          </option>
        ))}
      </FormSelect>
      <FormField
        id="purchaseDescription"
        label="Description (optionnel)"
        error={errors.description?.message}
        {...register("description")}
      />
      <FormSelect
        id="purchaseExpense"
        label="Dépense liée (optionnel)"
        error={errors.expenseId?.message}
        {...register("expenseId", { setValueAs: (v) => (v === "" ? undefined : v) })}
      >
        <option value="">Aucune</option>
        {expenses.map((expense) => (
          <option key={expense.id} value={expense.id}>
            {expense.label}
          </option>
        ))}
      </FormSelect>
      <label className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
        <input type="checkbox" className="mt-0.5" {...register("createExpense")} />
        <span>
          Créer automatiquement la dépense correspondante
          <span className="block text-xs text-slate-500 dark:text-slate-400">
            Laissez décoché si vous avez déjà sélectionné une dépense existante.
          </span>
        </span>
      </label>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="purchaseReceipt"
          className="text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          Justificatif (optionnel)
        </label>
        <input
          id="purchaseReceipt"
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
        {isPending ? "Enregistrement…" : "Enregistrer l'achat"}
      </SubmitButton>
    </form>
  );
}
