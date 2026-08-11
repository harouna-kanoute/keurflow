export interface FundingLike {
  amountMinor: number;
}

export interface ExpenseLike {
  amountMinor: number;
  status: "pending" | "needs_information" | "approved" | "rejected";
}

// Budget math is centralized here so the dashboard, the project page, the
// mobile app and PDF reports never compute it differently. Assumes all
// amounts passed in have already been normalized to the project's currency —
// cross-currency conversion is out of MVP scope (§100).

export function getTotalFunded(fundings: readonly FundingLike[]): number {
  return fundings.reduce((sum, f) => sum + f.amountMinor, 0);
}

// How much of the budget hasn't been funded yet — independent of spending.
// A project can be fully funded but not yet spent, or partly spent before
// being fully funded; funding coverage and budget consumption are tracked
// separately on purpose.
export function getFundingGap(budgetMinor: number, fundings: readonly FundingLike[]): number {
  return budgetMinor - getTotalFunded(fundings);
}

export function getFundingCoveragePercent(
  budgetMinor: number,
  fundings: readonly FundingLike[],
): number {
  if (budgetMinor <= 0) return 0;
  const funded = getTotalFunded(fundings);
  return Math.min(100, Math.max(0, Math.round((funded / budgetMinor) * 100)));
}

export function getApprovedExpensesTotal(expenses: readonly ExpenseLike[]): number {
  return expenses
    .filter((e) => e.status === "approved")
    .reduce((sum, e) => sum + e.amountMinor, 0);
}

export function getPendingExpensesTotal(expenses: readonly ExpenseLike[]): number {
  return expenses
    .filter((e) => e.status === "pending" || e.status === "needs_information")
    .reduce((sum, e) => sum + e.amountMinor, 0);
}

export function getRemainingBudget(budgetMinor: number, expenses: readonly ExpenseLike[]): number {
  return budgetMinor - getApprovedExpensesTotal(expenses);
}

// Percentage of budget consumed by approved expenses, 0-100, clamped.
export function getBudgetConsumptionPercent(
  budgetMinor: number,
  expenses: readonly ExpenseLike[],
): number {
  if (budgetMinor <= 0) return 0;
  const consumed = getApprovedExpensesTotal(expenses);
  return Math.min(100, Math.max(0, Math.round((consumed / budgetMinor) * 100)));
}
