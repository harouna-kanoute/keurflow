import { zodResolver } from "@hookform/resolvers/zod";
import { createPurchaseSchema, type CreatePurchaseInput } from "@keurflow/validation";
import { MATERIALS, PAYMENT_METHODS } from "@keurflow/config";
import { PURCHASE_UNITS } from "@keurflow/types";
import { calculatePurchaseTotalMinor, formatMoney } from "@keurflow/business";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FormInput } from "../../components/form-input";
import { PrimaryButton } from "../../components/primary-button";
import { SelectField } from "../../components/select-field";
import { SheetModal } from "../../components/sheet-modal";
import { minorUnitFor } from "../../lib/projectSummary";
import { supabase } from "../../lib/supabase";
import { useStyles, type Theme } from "../../theme";
import type { Supplier } from "./types";

const GENERIC_ERROR = "Une erreur est survenue. Veuillez réessayer.";
const MATERIAL_OPTIONS = MATERIALS.map((m) => ({ value: m.code, label: m.label }));
const UNIT_OPTIONS = PURCHASE_UNITS.map((u) => ({ value: u, label: u }));
const PAYMENT_OPTIONS = PAYMENT_METHODS.filter((m) => m.active).map((m) => ({
  value: m.code,
  label: m.label,
}));

export function AddPurchaseSheet({
  visible,
  onClose,
  onCreated,
  projectId,
  currencyCode,
  suppliers,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
  projectId: string;
  currencyCode: string;
  suppliers: Supplier[];
}) {
  const styles = useStyles(createStyles);
  const [pending, setPending] = useState(false);
  const [rootError, setRootError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const minorUnit = minorUnitFor(currencyCode);

  // A deactivated supplier keeps its history but is no longer offered here.
  const supplierOptions = suppliers
    .filter((s) => s.status === "active")
    .map((s) => ({ value: s.id, label: s.name }));

  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreatePurchaseInput>({
    resolver: zodResolver(createPurchaseSchema),
    defaultValues: {
      projectId,
      currencyCode,
      materialCode: "cement",
      unit: "sac",
      purchaseDate: new Date().toISOString().slice(0, 10),
    },
  });

  const materialCode = watch("materialCode");
  const quantity = Number(watch("quantity")) || 0;
  const unitPriceMinor = Number(watch("unitPriceMinor")) || 0;
  // Preview only — the database trigger recomputes the stored total.
  const previewTotal = calculatePurchaseTotalMinor({ quantity, unitPriceMinor });

  const pickReceipt = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (!result.canceled && result.assets[0]) setReceipt(result.assets[0]);
  };

  const onSubmit = handleSubmit(async (data) => {
    setPending(true);
    setRootError(null);
    try {
      const paymentMethodId = data.paymentMethodCode
        ? ((
            await supabase
              .from("payment_methods")
              .select("id")
              .eq("code", data.paymentMethodCode)
              .maybeSingle()
          ).data?.id ?? null)
        : null;

      // total_amount_minor is deliberately not sent: purchases_recompute_total
      // (DB trigger) computes it from quantity × unit price.
      const { data: purchase, error } = await supabase
        .from("purchases")
        .insert({
          project_id: projectId,
          supplier_id: data.supplierId,
          material_code: data.materialCode,
          material_name: data.materialName ?? null,
          description: data.description ?? null,
          purchase_date: data.purchaseDate,
          quantity: data.quantity,
          unit: data.unit,
          unit_price_minor: data.unitPriceMinor,
          currency_code: currencyCode,
          payment_method_id: paymentMethodId,
        })
        .select("id")
        .single();

      if (error || !purchase) {
        console.error("[createPurchase] Supabase error:", error?.code, error?.message);
        setRootError(GENERIC_ERROR);
        return;
      }

      if (receipt) {
        const filename = receipt.fileName ?? `facture-${Date.now()}.jpg`;
        const path = `${projectId}/${purchase.id}-${filename}`;
        const mimeType = receipt.mimeType ?? "image/jpeg";
        try {
          const arrayBuffer = await (await fetch(receipt.uri)).arrayBuffer();
          const { error: uploadError } = await supabase.storage
            .from("expense-receipts")
            .upload(path, arrayBuffer, { contentType: mimeType });
          if (!uploadError) {
            await supabase.from("documents").insert({
              project_id: projectId,
              purchase_id: purchase.id,
              document_type: "invoice",
              storage_path: path,
              filename,
              mime_type: mimeType,
              size: receipt.fileSize ?? 0,
            });
          }
        } catch {
          // Best-effort — the purchase itself is already saved either way.
        }
      }

      setReceipt(null);
      reset({
        projectId,
        currencyCode,
        materialCode: "cement",
        unit: "sac",
        purchaseDate: new Date().toISOString().slice(0, 10),
      });
      onCreated();
      onClose();
    } catch (err) {
      console.error("[createPurchase] unexpected error:", err);
      setRootError(GENERIC_ERROR);
    } finally {
      setPending(false);
    }
  });

  return (
    <SheetModal visible={visible} onClose={onClose} title="Enregistrer un achat">
      {supplierOptions.length === 0 ? (
        <Text style={styles.empty}>
          Ajoutez d&apos;abord un fournisseur actif pour pouvoir enregistrer un achat.
        </Text>
      ) : (
        <>
          <SelectField
            control={control}
            name="supplierId"
            label="Fournisseur"
            options={supplierOptions}
            error={errors.supplierId?.message}
          />
          <SelectField
            control={control}
            name="materialCode"
            label="Matériau"
            options={MATERIAL_OPTIONS}
            error={errors.materialCode?.message}
          />
          {materialCode === "other" && (
            <FormInput
              control={control}
              name="materialName"
              label="Nom du matériau"
              error={errors.materialName?.message}
            />
          )}
          <FormInput
            control={control}
            name="quantity"
            label="Quantité"
            keyboardType="decimal-pad"
            parse={(text) => {
              const n = Number(text.replace(",", "."));
              return text === "" || !Number.isFinite(n) ? undefined : n;
            }}
            error={errors.quantity?.message}
          />
          <SelectField
            control={control}
            name="unit"
            label="Unité"
            options={UNIT_OPTIONS}
            error={errors.unit?.message}
          />
          <FormInput
            control={control}
            name="unitPriceMinor"
            label={`Prix unitaire (${currencyCode})`}
            keyboardType="decimal-pad"
            parse={(text) => {
              const n = Number(text.replace(",", "."));
              return text === "" || !Number.isFinite(n)
                ? undefined
                : Math.round(n * 10 ** minorUnit);
            }}
            error={errors.unitPriceMinor?.message}
          />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Montant total</Text>
            <Text style={styles.totalValue}>
              {formatMoney(previewTotal, currencyCode, minorUnit)}
            </Text>
          </View>
          <FormInput
            control={control}
            name="purchaseDate"
            label="Date d'achat (AAAA-MM-JJ)"
            autoCapitalize="none"
            error={errors.purchaseDate?.message}
          />
          <SelectField
            control={control}
            name="paymentMethodCode"
            label="Moyen de paiement (optionnel)"
            options={PAYMENT_OPTIONS}
            error={errors.paymentMethodCode?.message}
          />
          <FormInput
            control={control}
            name="description"
            label="Description (optionnel)"
            error={errors.description?.message}
          />
          <Pressable style={styles.receiptButton} onPress={pickReceipt}>
            <Ionicons name="camera-outline" size={18} color={styles.receiptIcon.color} />
            <Text style={styles.receiptText}>
              {receipt ? "Justificatif ajouté ✓" : "Ajouter une facture (optionnel)"}
            </Text>
          </Pressable>
          {rootError && <Text style={styles.error}>{rootError}</Text>}
          <PrimaryButton onPress={onSubmit} pending={pending}>
            {pending ? "Enregistrement…" : "Enregistrer l'achat"}
          </PrimaryButton>
        </>
      )}
    </SheetModal>
  );
}

function createStyles(theme: Theme) {
  return {
    error: { fontSize: 13, color: theme.colors.danger },
    empty: { fontSize: 13, color: theme.colors.textMuted, lineHeight: 19 },
    totalRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      backgroundColor: theme.colors.background,
      borderRadius: theme.radius.md,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    totalLabel: { fontSize: 13, color: theme.colors.textMuted },
    totalValue: { fontSize: 16, fontWeight: "700" as const, color: theme.colors.text },
    receiptButton: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    receiptIcon: { color: theme.colors.textMuted },
    receiptText: { fontSize: 14, color: theme.colors.text },
  };
}
