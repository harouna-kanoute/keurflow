import { describe, expect, it } from "vitest";
import {
  getApprovedExpensesTotal,
  getBudgetConsumptionPercent,
  getPendingExpensesTotal,
  getRemainingBudget,
  getTotalFunded,
} from "./budget";

const fundings = [{ amountMinor: 1_000_000 }, { amountMinor: 500_000 }];
const expenses = [
  { amountMinor: 300_000, status: "approved" as const },
  { amountMinor: 100_000, status: "pending" as const },
  { amountMinor: 50_000, status: "needs_information" as const },
  { amountMinor: 200_000, status: "rejected" as const },
];

describe("getTotalFunded", () => {
  it("sums all fundings", () => {
    expect(getTotalFunded(fundings)).toBe(1_500_000);
  });

  it("returns 0 for no fundings", () => {
    expect(getTotalFunded([])).toBe(0);
  });
});

describe("getApprovedExpensesTotal", () => {
  it("only sums approved expenses", () => {
    expect(getApprovedExpensesTotal(expenses)).toBe(300_000);
  });
});

describe("getPendingExpensesTotal", () => {
  it("sums pending and needs_information, excludes approved/rejected", () => {
    expect(getPendingExpensesTotal(expenses)).toBe(150_000);
  });
});

describe("getRemainingBudget", () => {
  it("subtracts only approved expenses from the budget", () => {
    expect(getRemainingBudget(2_000_000, expenses)).toBe(1_700_000);
  });

  it("can go negative when overspent", () => {
    expect(getRemainingBudget(100_000, expenses)).toBe(-200_000);
  });
});

describe("getBudgetConsumptionPercent", () => {
  it("computes a rounded percentage of approved spend", () => {
    expect(getBudgetConsumptionPercent(1_000_000, expenses)).toBe(30);
  });

  it("clamps at 100 when overspent", () => {
    expect(getBudgetConsumptionPercent(100_000, expenses)).toBe(100);
  });

  it("returns 0 for a zero or negative budget instead of dividing by zero", () => {
    expect(getBudgetConsumptionPercent(0, expenses)).toBe(0);
    expect(getBudgetConsumptionPercent(-500, expenses)).toBe(0);
  });

  it("returns 0 when there are no expenses", () => {
    expect(getBudgetConsumptionPercent(1_000_000, [])).toBe(0);
  });
});
