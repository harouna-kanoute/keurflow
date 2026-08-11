import { describe, expect, it } from "vitest";
import { createExpenseSchema, updateExpenseStatusSchema } from "./expense";

describe("createExpenseSchema", () => {
  const base = {
    projectId: "50450d0e-1ae3-46cc-a46e-b29ea758757d",
    amountMinor: 150_000,
    currencyCode: "XOF",
    category: "materials",
    expenseDate: "2026-08-11",
  };

  it("accepts a valid expense without items", () => {
    expect(createExpenseSchema.safeParse(base).success).toBe(true);
  });

  it("accepts items instead of a direct amount", () => {
    const { amountMinor: _unused, ...rest } = base;
    expect(
      createExpenseSchema.safeParse({
        ...rest,
        items: [{ name: "Ciment", quantity: 10, unit: "sac", unitPriceMinor: 5000 }],
      }).success,
    ).toBe(true);
  });

  it("rejects a zero or negative amount", () => {
    expect(createExpenseSchema.safeParse({ ...base, amountMinor: 0 }).success).toBe(false);
  });

  it("rejects an item with zero quantity", () => {
    const { amountMinor: _unused, ...rest } = base;
    expect(
      createExpenseSchema.safeParse({
        ...rest,
        items: [{ name: "Ciment", quantity: 0, unit: "sac", unitPriceMinor: 5000 }],
      }).success,
    ).toBe(false);
  });
});

describe("updateExpenseStatusSchema", () => {
  it("accepts a known status", () => {
    expect(
      updateExpenseStatusSchema.safeParse({
        expenseId: "50450d0e-1ae3-46cc-a46e-b29ea758757d",
        status: "approved",
      }).success,
    ).toBe(true);
  });

  it("rejects an unknown status — e.g. someone trying to set a made-up value", () => {
    expect(
      updateExpenseStatusSchema.safeParse({
        expenseId: "50450d0e-1ae3-46cc-a46e-b29ea758757d",
        status: "definitely_approved",
      }).success,
    ).toBe(false);
  });
});
