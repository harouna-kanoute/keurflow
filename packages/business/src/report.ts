import { formatMoney } from "./money";

export interface ReportData {
  projectName: string;
  periodStart: string;
  periodEnd: string;
  budgetMinor: number;
  currencyCode: string;
  minorUnit: number;
  fundedInPeriodMinor: number;
  approvedInPeriodMinor: number;
  progressPercent: number;
  milestonesCompleted: number;
  milestonesTotal: number;
  documentsMissingCount: number;
  toReviewCount: number;
}

// Generates the text stored in reports.summary (spec §41) — a point-in-time
// snapshot, computed once at creation time from real project data, never
// regenerated live. Covers exactly the sections spec §41 lists: progression,
// financements, dépenses, budget, étapes, documents, points à vérifier.
export function generateProjectReportSummary(data: ReportData): string {
  const money = (amountMinor: number) => formatMoney(amountMinor, data.currencyCode, data.minorUnit);

  const lines = [
    `Rapport — ${data.projectName}`,
    `Période : ${data.periodStart} au ${data.periodEnd}`,
    "",
    `Progression : ${data.progressPercent}% (${data.milestonesCompleted}/${data.milestonesTotal} étapes terminées)`,
    "",
    `Budget total : ${money(data.budgetMinor)}`,
    `Financements reçus sur la période : ${money(data.fundedInPeriodMinor)}`,
    `Dépenses approuvées sur la période : ${money(data.approvedInPeriodMinor)}`,
    "",
    `Documents manquants : ${data.documentsMissingCount}`,
    `Dépenses à vérifier : ${data.toReviewCount}`,
  ];

  return lines.join("\n");
}
