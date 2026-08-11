import { describe, expect, it } from "vitest";
import { generateProjectReportSummary } from "./report";

describe("generateProjectReportSummary", () => {
  const base = {
    projectName: "Construction maison familiale",
    periodStart: "2026-08-01",
    periodEnd: "2026-08-31",
    budgetMinor: 25_000_00,
    currencyCode: "EUR",
    minorUnit: 2,
    fundedInPeriodMinor: 18_000_00,
    approvedInPeriodMinor: 5_000_00,
    progressPercent: 40,
    milestonesCompleted: 4,
    milestonesTotal: 10,
    documentsMissingCount: 1,
    toReviewCount: 2,
  };

  it("includes the project name and period", () => {
    const summary = generateProjectReportSummary(base);
    expect(summary).toContain("Construction maison familiale");
    expect(summary).toContain("2026-08-01");
    expect(summary).toContain("2026-08-31");
  });

  it("includes progression as completed/total, not just a bare percentage", () => {
    const summary = generateProjectReportSummary(base);
    expect(summary).toContain("40%");
    expect(summary).toContain("4/10");
  });

  it("formats money using the project's own currency, not a hardcoded one", () => {
    const summaryEur = generateProjectReportSummary(base);
    expect(summaryEur).toContain("€");

    const summaryXof = generateProjectReportSummary({
      ...base,
      currencyCode: "XOF",
      minorUnit: 0,
      budgetMinor: 15_000_000,
    });
    // Intl inserts a narrow no-break space (U+202F) between "F" and "CFA",
    // not a plain space — check loosely rather than hardcoding that character.
    expect(summaryXof).toMatch(/F.CFA/);
    expect(summaryXof).not.toContain("€");
  });

  it("surfaces documents manquants and à vérifier counts, even at zero", () => {
    const summary = generateProjectReportSummary({
      ...base,
      documentsMissingCount: 0,
      toReviewCount: 0,
    });
    expect(summary).toContain("Documents manquants : 0");
    expect(summary).toContain("Dépenses à vérifier : 0");
  });
});
