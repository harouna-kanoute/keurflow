import { zodResolver } from "@hookform/resolvers/zod";
import { updateProjectSchema, type UpdateProjectInput } from "@keurflow/validation";
import { PROJECT_TYPES } from "@keurflow/config";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Text } from "react-native";
import { FormInput } from "../../components/form-input";
import { PrimaryButton } from "../../components/primary-button";
import { SelectField } from "../../components/select-field";
import { SheetModal } from "../../components/sheet-modal";
import { minorUnitFor } from "../../lib/projectSummary";
import { supabase } from "../../lib/supabase";
import { useStyles, type Theme } from "../../theme";
import type { Project } from "./types";

const GENERIC_ERROR = "Une erreur est survenue. Veuillez réessayer.";
const PROJECT_TYPE_OPTIONS = PROJECT_TYPES.map((t) => ({ value: t.code, label: t.label }));

// Country/currency are deliberately not editable here (matches web's
// EditProjectForm) — changing them after creation would desync every
// budget/amount figure already recorded in the project's currency.
export function EditProjectSheet({
  visible,
  onClose,
  onSaved,
  project,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  project: Project;
}) {
  const styles = useStyles(createStyles);
  const [pending, setPending] = useState(false);
  const [rootError, setRootError] = useState<string | null>(null);
  const minorUnit = minorUnitFor(project.currency_code);
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateProjectInput>({
    resolver: zodResolver(updateProjectSchema),
    defaultValues: defaultValuesFor(project),
  });

  useEffect(() => {
    if (visible) reset(defaultValuesFor(project));
  }, [visible, project, reset]);

  const onSubmit = handleSubmit(async (data) => {
    setPending(true);
    setRootError(null);

    // RLS (projects_update_org_managers_or_project_owners) is the
    // authoritative check.
    const { error } = await supabase
      .from("projects")
      .update({
        name: data.name,
        description: data.description ?? null,
        project_type: data.projectType,
        city: data.city ?? null,
        address: data.address ?? null,
        surface_area: data.surfaceArea ?? null,
        budget_minor: data.budgetMinor,
        start_date: data.startDate ?? null,
        expected_end_date: data.expectedEndDate ?? null,
      })
      .eq("id", project.id);

    setPending(false);
    if (error) {
      console.error("[updateProject] Supabase error:", error.code, error.message);
      setRootError(GENERIC_ERROR);
      return;
    }

    onSaved();
    onClose();
  });

  return (
    <SheetModal visible={visible} onClose={onClose} title="Modifier le chantier">
      <FormInput control={control} name="name" label="Nom du chantier" error={errors.name?.message} />
      <FormInput
        control={control}
        name="description"
        label="Description (optionnel)"
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
      <FormInput control={control} name="city" label="Ville (optionnel)" error={errors.city?.message} />
      <FormInput
        control={control}
        name="address"
        label="Adresse du chantier (optionnel)"
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
        label={`Budget (${project.currency_code})`}
        keyboardType="decimal-pad"
        parse={(text) => {
          const n = Number(text.replace(",", "."));
          return text === "" || !Number.isFinite(n) ? 0 : Math.round(n * 10 ** minorUnit);
        }}
        error={errors.budgetMinor?.message}
      />
      <FormInput
        control={control}
        name="startDate"
        label="Début (optionnel, AAAA-MM-JJ)"
        autoCapitalize="none"
        parse={(text) => (text === "" ? undefined : text)}
        error={errors.startDate?.message}
      />
      <FormInput
        control={control}
        name="expectedEndDate"
        label="Fin prévue (optionnel, AAAA-MM-JJ)"
        autoCapitalize="none"
        parse={(text) => (text === "" ? undefined : text)}
        error={errors.expectedEndDate?.message}
      />
      {rootError && <Text style={styles.error}>{rootError}</Text>}
      <PrimaryButton onPress={onSubmit} pending={pending}>
        {pending ? "Enregistrement…" : "Enregistrer"}
      </PrimaryButton>
    </SheetModal>
  );
}

function defaultValuesFor(project: Project): UpdateProjectInput {
  return {
    projectId: project.id,
    name: project.name,
    description: project.description ?? undefined,
    projectType: project.project_type,
    city: project.city ?? undefined,
    address: project.address ?? undefined,
    surfaceArea: project.surface_area ?? undefined,
    budgetMinor: project.budget_minor,
    startDate: project.start_date ?? undefined,
    expectedEndDate: project.expected_end_date ?? undefined,
  };
}

function createStyles(theme: Theme) {
  return {
    error: { fontSize: 13, color: theme.colors.danger },
  };
}
