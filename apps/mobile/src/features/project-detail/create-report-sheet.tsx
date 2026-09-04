import { zodResolver } from "@hookform/resolvers/zod";
import { createReportSchema, type CreateReportInput } from "@keurflow/validation";
import {
  deriveDocumentationStatus,
  generateProjectReportSummary,
  getApprovedExpensesTotal,
  getMilestoneProgressPercent,
  getTotalFunded,
  type ReportData,
} from "@keurflow/business";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Text } from "react-native";
import { FormInput } from "../../components/form-input";
import { PrimaryButton } from "../../components/primary-button";
import { SheetModal } from "../../components/sheet-modal";
import { minorUnitFor } from "../../lib/projectSummary";
import { supabase } from "../../lib/supabase";
import { useStyles, type Theme } from "../../theme";

const GENERIC_ERROR = "Une erreur est survenue. Veuillez réessayer.";

// Mirrors web's createReport Server Action exactly (same aggregation, same
// generateProjectReportSummary snapshot) — mobile just runs it client-side
// against RLS-scoped queries instead of behind a Server Action, same
// pattern as the rest of this screen's writes.
export function CreateReportSheet({
  visible,
  onClose,
  onCreated,
  projectId,
  projectName,
  budgetMinor,
  currencyCode,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
  projectId: string;
  projectName: string;
  budgetMinor: number;
  currencyCode: string;
}) {
  const styles = useStyles(createStyles);
  const [pending, setPending] = useState(false);
  const [rootError, setRootError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateReportInput>({
    resolver: zodResolver(createReportSchema),
    defaultValues: { projectId },
  });

  const onSubmit = handleSubmit(async (data) => {
    setPending(true);
    setRootError(null);
    try {
      const [{ data: fundings }, { data: expenses }, { data: milestones }, { data: documents }] =
        await Promise.all([
          supabase
            .from("fundings")
            .select("amount_minor")
            .eq("project_id", projectId)
            .gte("funding_date", data.periodStart)
            .lte("funding_date", data.periodEnd),
          supabase.from("expenses").select("id, amount_minor, status, expense_date").eq("project_id", projectId),
          supabase.from("milestones").select("status").eq("project_id", projectId),
          supabase.from("documents").select("expense_id").eq("project_id", projectId).not("expense_id", "is", null),
        ]);

      const expensesInPeriod = (expenses ?? []).filter(
        (e) => e.expense_date >= data.periodStart && e.expense_date <= data.periodEnd,
      );
      const approvedInPeriod = getApprovedExpensesTotal(
        expensesInPeriod.map((e) => ({
          amountMinor: e.amount_minor,
          status: e.status as "pending" | "needs_information" | "approved" | "rejected",
        })),
      );

      const docCountByExpense = new Map<string, number>();
      for (const doc of documents ?? []) {
        if (!doc.expense_id) continue;
        docCountByExpense.set(doc.expense_id, (docCountByExpense.get(doc.expense_id) ?? 0) + 1);
      }
      const documentsMissingCount = (expenses ?? []).filter(
        (e) => deriveDocumentationStatus(docCountByExpense.get(e.id) ?? 0) === "missing",
      ).length;
      const toReviewCount = (expenses ?? []).filter(
        (e) => e.status === "pending" || e.status === "needs_information",
      ).length;

      const milestoneList = (milestones ?? []).map((m) => ({
        status: m.status as "pending" | "in_progress" | "completed" | "delayed",
      }));

      const reportData: ReportData = {
        projectName,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        budgetMinor,
        currencyCode,
        minorUnit: minorUnitFor(currencyCode),
        fundedInPeriodMinor: getTotalFunded((fundings ?? []).map((f) => ({ amountMinor: f.amount_minor }))),
        approvedInPeriodMinor: approvedInPeriod,
        progressPercent: getMilestoneProgressPercent(milestoneList),
        milestonesCompleted: milestoneList.filter((m) => m.status === "completed").length,
        milestonesTotal: milestoneList.length,
        documentsMissingCount,
        toReviewCount,
      };

      // RLS (reports_insert_non_viewers, billing-gated) is the authoritative
      // check on whether this user may create a report for this project.
      const { error } = await supabase.from("reports").insert({
        project_id: projectId,
        period_start: data.periodStart,
        period_end: data.periodEnd,
        summary: generateProjectReportSummary(reportData),
        metrics: reportData,
      });

      if (error) {
        console.error("[createReport] Supabase error:", error.code, error.message);
        setRootError(GENERIC_ERROR);
        return;
      }

      reset({ projectId });
      onCreated();
      onClose();
    } catch (err) {
      console.error("[createReport] unexpected error:", err);
      setRootError(GENERIC_ERROR);
    } finally {
      setPending(false);
    }
  });

  return (
    <SheetModal visible={visible} onClose={onClose} title="Générer un rapport">
      <FormInput
        control={control}
        name="periodStart"
        label="Début de période (AAAA-MM-JJ)"
        placeholder="2026-08-01"
        autoCapitalize="none"
        error={errors.periodStart?.message}
      />
      <FormInput
        control={control}
        name="periodEnd"
        label="Fin de période (AAAA-MM-JJ)"
        placeholder="2026-08-31"
        autoCapitalize="none"
        error={errors.periodEnd?.message}
      />
      {rootError && <Text style={styles.error}>{rootError}</Text>}
      <PrimaryButton onPress={onSubmit} pending={pending}>
        {pending ? "Génération…" : "Générer"}
      </PrimaryButton>
    </SheetModal>
  );
}

function createStyles(theme: Theme) {
  return {
    error: { fontSize: 13, color: theme.colors.danger },
  };
}
