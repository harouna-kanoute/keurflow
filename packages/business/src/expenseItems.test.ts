import { describe, expect, it } from "vitest";
import { calculateExpenseTotal, calculateItemTotal } from "./expenseItems";

describe("calculateItemTotal", () => {
  it("multiplies quantity by unit price", () => {
    expect(calculateItemTotal({ quantity: 10, unitPriceMinor: 1500 })).toBe(15000);
  });

  it("rounds fractional results", () => {
    expect(calculateItemTotal({ quantity: 3, unitPriceMinor: 333 })).toBe(999);
    expect(calculateItemTotal({ quantity: 2.5, unitPriceMinor: 100 })).toBe(250);
  });

  it("handles zero quantity", () => {
    expect(calculateItemTotal({ quantity: 0, unitPriceMinor: 5000 })).toBe(0);
  });
});

describe("calculateExpenseTotal", () => {
  it("sums item totals — never trusts a client-submitted total (§29)", () => {
    const items = [
      { quantity: 2, unitPriceMinor: 1000 },
      { quantity: 3, unitPriceMinor: 500 },
    ];
    expect(calculateExpenseTotal(items)).toBe(3500);
  });

  it("returns 0 for no items", () => {
    expect(calculateExpenseTotal([])).toBe(0);
  });
});
