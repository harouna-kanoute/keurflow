import { zodResolver } from "@hookform/resolvers/zod";
import { createSupplierSchema, type CreateSupplierInput } from "@keurflow/validation";
import { COUNTRIES } from "@keurflow/config";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Text } from "react-native";
import { FormInput } from "../../components/form-input";
import { PrimaryButton } from "../../components/primary-button";
import { SelectField } from "../../components/select-field";
import { SheetModal } from "../../components/sheet-modal";
import { supabase } from "../../lib/supabase";
import { useStyles, type Theme } from "../../theme";
import type { Supplier } from "./types";

const GENERIC_ERROR = "Une erreur est survenue. Veuillez réessayer.";
const COUNTRY_OPTIONS = COUNTRIES.filter((c) => c.active).map((c) => ({
  value: c.code,
  label: c.name,
}));

// Create/edit in one sheet, same as web's SupplierForm. Writes go straight to
// Supabase with RLS (suppliers_insert_org_managers / _update_org_managers) as
// the only authority — mobile has no server layer of its own.
export function AddSupplierSheet({
  visible,
  onClose,
  onSaved,
  organizationId,
  supplier,
  supplierCountryCode,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  organizationId: string;
  supplier?: Supplier;
  supplierCountryCode?: string;
}) {
  const styles = useStyles(createStyles);
  const [pending, setPending] = useState(false);
  const [rootError, setRootError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateSupplierInput>({
    resolver: zodResolver(createSupplierSchema),
    defaultValues: { organizationId, countryCode: supplierCountryCode },
  });

  useEffect(() => {
    if (!visible) return;
    reset({
      organizationId,
      name: supplier?.name ?? "",
      contactName: supplier?.contact_name ?? undefined,
      phone: supplier?.phone ?? undefined,
      whatsapp: supplier?.whatsapp ?? undefined,
      email: supplier?.email ?? undefined,
      address: supplier?.address ?? undefined,
      city: supplier?.city ?? undefined,
      countryCode: supplierCountryCode,
      specialties: supplier?.specialties ?? undefined,
      notes: supplier?.notes ?? undefined,
    });
  }, [visible, supplier, supplierCountryCode, organizationId, reset]);

  const onSubmit = handleSubmit(async (data) => {
    setPending(true);
    setRootError(null);
    try {
      const { data: country } = await supabase
        .from("countries")
        .select("id")
        .eq("code", data.countryCode)
        .maybeSingle();
      if (!country) {
        setRootError(GENERIC_ERROR);
        return;
      }

      const payload = {
        name: data.name,
        contact_name: data.contactName ?? null,
        phone: data.phone ?? null,
        whatsapp: data.whatsapp ?? null,
        email: data.email ?? null,
        address: data.address ?? null,
        city: data.city ?? null,
        country_id: country.id,
        specialties: data.specialties ?? null,
        notes: data.notes ?? null,
      };

      const { error } = supplier
        ? await supabase.from("suppliers").update(payload).eq("id", supplier.id)
        : await supabase.from("suppliers").insert({ ...payload, organization_id: organizationId });

      if (error) {
        console.error("[saveSupplier] Supabase error:", error.code, error.message);
        setRootError(GENERIC_ERROR);
        return;
      }

      onSaved();
      onClose();
    } catch (err) {
      console.error("[saveSupplier] unexpected error:", err);
      setRootError(GENERIC_ERROR);
    } finally {
      setPending(false);
    }
  });

  return (
    <SheetModal
      visible={visible}
      onClose={onClose}
      title={supplier ? "Modifier le fournisseur" : "Ajouter un fournisseur"}
    >
      <FormInput control={control} name="name" label="Nom du fournisseur" error={errors.name?.message} />
      <FormInput
        control={control}
        name="contactName"
        label="Personne de contact (optionnel)"
        error={errors.contactName?.message}
      />
      <FormInput
        control={control}
        name="phone"
        label="Téléphone (optionnel)"
        placeholder="+221771234567"
        keyboardType="phone-pad"
        error={errors.phone?.message}
      />
      <FormInput
        control={control}
        name="whatsapp"
        label="WhatsApp (optionnel)"
        placeholder="+221771234567"
        keyboardType="phone-pad"
        error={errors.whatsapp?.message}
      />
      <FormInput
        control={control}
        name="email"
        label="Email (optionnel)"
        keyboardType="email-address"
        error={errors.email?.message}
      />
      <FormInput
        control={control}
        name="city"
        label="Ville (optionnel)"
        error={errors.city?.message}
      />
      <SelectField
        control={control}
        name="countryCode"
        label="Pays"
        options={COUNTRY_OPTIONS}
        error={errors.countryCode?.message}
      />
      <FormInput
        control={control}
        name="specialties"
        label="Spécialités (optionnel)"
        placeholder="ciment, fer, matériaux"
        error={errors.specialties?.message}
      />
      <FormInput
        control={control}
        name="notes"
        label="Notes (optionnel)"
        multiline
        numberOfLines={3}
        error={errors.notes?.message}
      />
      {rootError && <Text style={styles.error}>{rootError}</Text>}
      <PrimaryButton onPress={onSubmit} pending={pending}>
        {pending ? "Enregistrement…" : supplier ? "Enregistrer" : "Ajouter"}
      </PrimaryButton>
    </SheetModal>
  );
}

function createStyles(theme: Theme) {
  return {
    error: { fontSize: 13, color: theme.colors.danger },
  };
}
