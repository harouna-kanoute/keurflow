import { zodResolver } from "@hookform/resolvers/zod";
import { createFundingSchema, type CreateFundingInput } from "@keurflow/validation";
import { PAYMENT_METHODS } from "@keurflow/config";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Text } from "react-native";
import { FormInput } from "../../components/form-input";
import { PrimaryButton } from "../../components/primary-button";
import { SelectField } from "../../components/select-field";
import { SheetModal } from "../../components/sheet-modal";
import { supabase } from "../../lib/supabase";
import { useStyles, type Theme } from "../../theme";
import type { PaymentMethod } from "./types";

const GENERIC_ERROR = "Une erreur est survenue. Veuillez réessayer.";
const PAYMENT_METHOD_OPTIONS = PAYMENT_METHODS.filter((m) => m.active).map((m) => ({
  value: m.code,
  label: m.label,
}));

export function AddFundingSheet({
  visible,
  onClose,
  onCreated,
  projectId,
  currencyCode,
  minorUnit,
  paymentMethods,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
  projectId: string;
  currencyCode: string;
  minorUnit: number;
  paymentMethods: PaymentMethod[];
}) {
  const styles = useStyles(createStyles);
  const [pending, setPending] = useState(false);
  const [rootError, setRootError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateFundingInput>({
    resolver: zodResolver(createFundingSchema),
    defaultValues: { projectId, currencyCode, fundingDate: new Date().toISOString().slice(0, 10) },
  });

  const onSubmit = handleSubmit(async (data) => {
    const paymentMethod = paymentMethods.find((m) => m.code === data.paymentMethodCode);
    if (!paymentMethod) {
      setRootError(GENERIC_ERROR);
      return;
    }

    setPending(true);
    setRootError(null);

    // created_by defaults to auth.uid() in the DB; RLS
    // (fundings_insert_non_viewers) is the authoritative check.
    const { error } = await supabase.from("fundings").insert({
      project_id: projectId,
      amount_minor: data.amountMinor,
      currency_code: currencyCode,
      payment_method_id: paymentMethod.id,
      reference: data.reference ?? null,
      description: data.description ?? null,
      funding_date: data.fundingDate,
    });

    setPending(false);
    if (error) {
      setRootError(GENERIC_ERROR);
      return;
    }

    reset({ projectId, currencyCode, fundingDate: new Date().toISOString().slice(0, 10) });
    onCreated();
    onClose();
  });

  return (
    <SheetModal visible={visible} onClose={onClose} title="Ajouter un financement">
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
        name="paymentMethodCode"
        label="Moyen de paiement"
        options={PAYMENT_METHOD_OPTIONS}
        error={errors.paymentMethodCode?.message}
      />
      <FormInput
        control={control}
        name="reference"
        label="Référence (optionnel)"
        error={errors.reference?.message}
      />
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
  };
}
