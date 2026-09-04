import { zodResolver } from "@hookform/resolvers/zod";
import { createProjectSchema, type CreateProjectInput } from "@keurflow/validation";
import { COUNTRIES, CURRENCIES, PROJECT_TYPES } from "@keurflow/config";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { FormInput } from "../../../src/components/form-input";
import { PrimaryButton } from "../../../src/components/primary-button";
import { SelectField } from "../../../src/components/select-field";
import { useOrgMembership } from "../../../src/features/navigation/use-org-membership";
import { supabase } from "../../../src/lib/supabase";
import { useStyles, type Theme } from "../../../src/theme";

const GENERIC_ERROR = "Une erreur est survenue. Veuillez réessayer.";

const PROJECT_TYPE_OPTIONS = PROJECT_TYPES.map((t) => ({ value: t.code, label: t.label }));
const ACTIVE_COUNTRIES = COUNTRIES.filter((c) => c.active);
const COUNTRY_OPTIONS = ACTIVE_COUNTRIES.map((c) => ({ value: c.code, label: c.name }));

function minorUnitFor(currencyCode: string | undefined): number {
  return CURRENCIES.find((c) => c.code === currencyCode)?.minorUnit ?? 2;
}

export default function NewProjectScreen() {
  const styles = useStyles(createStyles);
  const { membership } = useOrgMembership();
  const [pending, setPending] = useState(false);
  const [rootError, setRootError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: { organizationId: membership?.organizationId ?? "", projectType: "construction" },
  });

  // organizationId isn't known synchronously on first render (useOrgMembership
  // loads it async) — keep the hidden field in sync once it resolves.
  useEffect(() => {
    if (membership) setValue("organizationId", membership.organizationId);
  }, [membership, setValue]);

  const countryCode = watch("countryCode");

  // Same cascade as web's create-project-form.tsx: the project's currency
  // always follows its country, never picked independently.
  useEffect(() => {
    const country = ACTIVE_COUNTRIES.find((c) => c.code === countryCode);
    if (country) setValue("currencyCode", country.currencyCode, { shouldValidate: true });
  }, [countryCode, setValue]);

  const onSubmit = handleSubmit(async (data) => {
    setPending(true);
    setRootError(null);
    try {
      const { data: country } = await supabase
        .from("countries")
        .select("id")
        .eq("code", data.countryCode)
        .single();

      if (!country) {
        setRootError(GENERIC_ERROR);
        return;
      }

      // create_project() is SECURITY DEFINER: checks the caller's org role
      // server-side and, if authorized, inserts the project row and the
      // caller's project_owner membership row atomically.
      const { data: newProject, error } = await supabase.rpc("create_project", {
        p_organization_id: data.organizationId,
        p_name: data.name,
        p_description: data.description ?? null,
        p_project_type: data.projectType,
        p_country_id: country.id,
        p_city: data.city ?? null,
        p_budget_minor: data.budgetMinor,
        p_currency_code: data.currencyCode,
        p_address: data.address ?? null,
        p_surface_area: data.surfaceArea ?? null,
        p_start_date: data.startDate ?? null,
        p_expected_end_date: data.expectedEndDate ?? null,
      });

      if (error) {
        console.error("[createProject] Supabase error:", error.code, error.message);
        // KF001/KF002 — trial expired / plan limit reached (create_project()'s
        // own errcodes, see supabase/migrations/20260811310000_project_limits.sql).
        if (error.code === "KF001") {
          setRootError("Votre essai est terminé. Passez à l'abonnement payant pour continuer.");
        } else if (error.code === "KF002") {
          setRootError("Limite de chantiers atteinte pour votre plan actuel.");
        } else {
          setRootError(GENERIC_ERROR);
        }
        return;
      }

      router.replace(newProject ? `/projects/${newProject.id}` : "/");
    } catch (err) {
      console.error("[createProject] unexpected error:", err);
      setRootError(GENERIC_ERROR);
    } finally {
      setPending(false);
    }
  });

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Nouveau chantier</Text>

        <View style={styles.form}>
          <FormInput
            control={control}
            name="name"
            label="Nom du chantier"
            placeholder="Ex : Construction maison familiale"
            error={errors.name?.message}
          />
          <FormInput
            control={control}
            name="description"
            label="Description (optionnel)"
            placeholder="Quelques détails utiles sur le projet"
            multiline
            numberOfLines={3}
            error={errors.description?.message}
          />
          <SelectField
            control={control}
            name="projectType"
            label="Type"
            options={PROJECT_TYPE_OPTIONS}
            error={errors.projectType?.message}
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
            name="city"
            label="Ville (optionnel)"
            placeholder="Ex : Dakar"
            error={errors.city?.message}
          />
          <FormInput
            control={control}
            name="address"
            label="Adresse du chantier (optionnel)"
            placeholder="Ex : 12 rue des Manguiers, Dakar"
            error={errors.address?.message}
          />
          <FormInput
            control={control}
            name="surfaceArea"
            label="Superficie en m² (optionnel)"
            keyboardType="decimal-pad"
            parse={(text) => {
              const n = Number(text.replace(",", "."));
              return text === "" || !Number.isFinite(n) ? undefined : n;
            }}
            error={errors.surfaceArea?.message}
          />
          <FormInput
            control={control}
            name="budgetMinor"
            label={`Budget${countryCode ? ` (${watch("currencyCode") ?? ""})` : ""}`}
            keyboardType="decimal-pad"
            parse={(text) => {
              const n = Number(text.replace(",", "."));
              return text === "" || !Number.isFinite(n)
                ? 0
                : Math.round(n * 10 ** minorUnitFor(watch("currencyCode")));
            }}
            error={errors.budgetMinor?.message}
          />
          <FormInput
            control={control}
            name="startDate"
            label="Début (optionnel, AAAA-MM-JJ)"
            placeholder="2026-01-15"
            autoCapitalize="none"
            parse={(text) => (text === "" ? undefined : text)}
            error={errors.startDate?.message}
          />
          <FormInput
            control={control}
            name="expectedEndDate"
            label="Fin prévue (optionnel, AAAA-MM-JJ)"
            placeholder="2026-12-31"
            autoCapitalize="none"
            parse={(text) => (text === "" ? undefined : text)}
            error={errors.expectedEndDate?.message}
          />
          {rootError && <Text style={styles.error}>{rootError}</Text>}
          <PrimaryButton onPress={onSubmit} pending={pending}>
            {pending ? "Création…" : "Créer le chantier"}
          </PrimaryButton>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(theme: Theme) {
  return {
    flex: { flex: 1, backgroundColor: theme.colors.background },
    container: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xxxl },
    title: {
      fontSize: 22,
      fontWeight: "700" as const,
      color: theme.colors.text,
      marginBottom: theme.spacing.lg,
    },
    form: { gap: theme.spacing.md },
    error: { fontSize: 13, color: theme.colors.danger },
  };
}
