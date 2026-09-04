import { zodResolver } from "@hookform/resolvers/zod";
import { createExpenseSchema, type CreateExpenseInput } from "@keurflow/validation";
import { EXPENSE_CATEGORIES } from "@keurflow/config";
import { getCurrencyMinorUnit } from "@keurflow/business";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FormInput } from "../../components/form-input";
import { PrimaryButton } from "../../components/primary-button";
import { SelectField } from "../../components/select-field";
import { SheetModal } from "../../components/sheet-modal";
import { useDisplayCurrency } from "../../lib/display-currency-context";
import { supabase } from "../../lib/supabase";
import { useStyles, type Theme } from "../../theme";

const GENERIC_ERROR = "Une erreur est survenue. Veuillez réessayer.";
const CATEGORY_OPTIONS = EXPENSE_CATEGORIES.map((c) => ({ value: c.code, label: c.label }));

export function AddExpenseSheet({
  visible,
  onClose,
  onCreated,
  projectId,
  currencyCode: projectCurrencyCode,
  minorUnit: projectMinorUnit,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
  projectId: string;
  currencyCode: string;
  minorUnit: number;
}) {
  const styles = useStyles(createStyles);
  const [pending, setPending] = useState(false);
  const [rootError, setRootError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const { displayCurrency } = useDisplayCurrency();

  // The expense's own currency follows the user's chosen display-currency
  // preference (Settings) rather than always being forced into the
  // project's native one — same preference already respected everywhere
  // else amounts are shown (Money, MultiCurrencyAmount).
  const currencyCode = displayCurrency !== "native" ? displayCurrency : projectCurrencyCode;
  const minorUnit = displayCurrency !== "native" ? getCurrencyMinorUnit(displayCurrency) : projectMinorUnit;

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CreateExpenseInput>({
    resolver: zodResolver(createExpenseSchema),
    defaultValues: {
      projectId,
      currencyCode,
      category: "materials",
      expenseDate: new Date().toISOString().slice(0, 10),
    },
  });

  // Keep the form's hidden currencyCode in sync if the display-currency
  // preference changes while the sheet happens to be open.
  useEffect(() => {
    setValue("currencyCode", currencyCode);
  }, [currencyCode, setValue]);

  const pickReceipt = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) setReceipt(result.assets[0]);
  };

  const onSubmit = handleSubmit(async (data) => {
    if (!data.amountMinor) {
      setRootError("Montant requis");
      return;
    }

    setPending(true);
    setRootError(null);

    const { data: expense, error } = await supabase
      .from("expenses")
      .insert({
        project_id: projectId,
        amount_minor: data.amountMinor,
        currency_code: currencyCode,
        category: data.category,
        description: data.description ?? null,
        supplier_name: data.supplierName ?? null,
        expense_date: data.expenseDate,
      })
      .select("id")
      .single();

    if (error || !expense) {
      setPending(false);
      setRootError(GENERIC_ERROR);
      return;
    }

    if (receipt) {
      const filename = receipt.fileName ?? `receipt-${Date.now()}.jpg`;
      const path = `${projectId}/${expense.id}-${filename}`;
      const mimeType = receipt.mimeType ?? "image/jpeg";
      try {
        const arrayBuffer = await (await fetch(receipt.uri)).arrayBuffer();
        const { error: uploadError } = await supabase.storage
          .from("expense-receipts")
          .upload(path, arrayBuffer, { contentType: mimeType });
        if (!uploadError) {
          await supabase.from("documents").insert({
            project_id: projectId,
            expense_id: expense.id,
            document_type: "receipt",
            storage_path: path,
            filename,
            mime_type: mimeType,
            size: receipt.fileSize ?? 0,
          });
        }
      } catch {
        // Best-effort — the expense itself is already saved either way.
      }
    }

    setPending(false);
    setReceipt(null);
    reset({ projectId, currencyCode, category: "materials", expenseDate: new Date().toISOString().slice(0, 10) });
    onCreated();
    onClose();
  });

  return (
    <SheetModal visible={visible} onClose={onClose} title="Ajouter une dépense">
      <FormInput
        control={control}
        name="amountMinor"
        label={`Montant (${currencyCode})`}
        keyboardType="decimal-pad"
        parse={(text) => {
          const n = Number(text.replace(",", "."));
          return Number.isFinite(n) ? Math.round(n * 10 ** minorUnit) : undefined;
        }}
        error={errors.amountMinor?.message}
      />
      <SelectField
        control={control}
        name="category"
        label="Catégorie"
        options={CATEGORY_OPTIONS}
        error={errors.category?.message}
      />
      <FormInput
        control={control}
        name="supplierName"
        label="Fournisseur (optionnel)"
        error={errors.supplierName?.message}
      />
      <Pressable style={styles.receiptButton} onPress={pickReceipt}>
        <Ionicons name="camera-outline" size={18} color={styles.receiptIcon.color} />
        <Text style={styles.receiptText}>
          {receipt ? "Justificatif ajouté ✓" : "Ajouter un justificatif (optionnel)"}
        </Text>
      </Pressable>
      {rootError && <Text style={styles.error}>{rootError}</Text>}
      <PrimaryButton onPress={onSubmit} pending={pending}>
        {pending ? "Ajout…" : "Ajouter"}
      </PrimaryButton>
    </SheetModal>
  );
}

function createStyles(theme: Theme) {
  return {
    error: { fontSize: 13, color: theme.colors.danger },
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
