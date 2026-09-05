import { describe, expect, it } from "vitest";
import { createPurchaseSchema } from "./purchase";

describe("createPurchaseSchema", () => {
  const base = {
    projectId: "50450d0e-1ae3-46cc-a46e-b29ea758757d",
    supplierId: "0f1c2b3a-4d5e-4f60-8a7b-9c0d1e2f3a4b",
    materialCode: "cement",
    purchaseDate: "2026-09-05",
    quantity: 50,
    unit: "sac",
    unitPriceMinor: 5500,
    currencyCode: "XOF",
  };

  it("accepts a valid purchase", () => {
    expect(createPurchaseSchema.safeParse(base).success).toBe(true);
  });

  it("has no total field — the total is never taken from the client", () => {
    const result = createPurchaseSchema.safeParse({ ...base, totalAmountMinor: 1 });
    expect(result.success).toBe(true);
    if (result.success) expect("totalAmountMinor" in result.data).toBe(false);
  });

  it("rejects a zero or negative quantity and price", () => {
    expect(createPurchaseSchema.safeParse({ ...base, quantity: 0 }).success).toBe(false);
    expect(createPurchaseSchema.safeParse({ ...base, unitPriceMinor: 0 }).success).toBe(false);
  });

  it("requires a custom name when the material is 'other'", () => {
    expect(createPurchaseSchema.safeParse({ ...base, materialCode: "other" }).success).toBe(false);
    expect(
      createPurchaseSchema.safeParse({ ...base, materialCode: "other", materialName: "Chaux" })
        .success,
    ).toBe(true);
  });

  it("rejects an unknown payment method", () => {
    expect(createPurchaseSchema.safeParse({ ...base, paymentMethodCode: "bitcoin" }).success).toBe(
      false,
    );
    expect(createPurchaseSchema.safeParse({ ...base, paymentMethodCode: "wave" }).success).toBe(
      true,
    );
  });

  it("refuses to both link an existing expense and create a new one", () => {
    expect(
      createPurchaseSchema.safeParse({
        ...base,
        expenseId: "9a1b2c3d-4e5f-4a6b-8c9d-0e1f2a3b4c5d",
        createExpense: true,
      }).success,
    ).toBe(false);
  });
});
