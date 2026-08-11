import { describe, expect, it } from "vitest";
import { createFundingSchema } from "./funding";

describe("createFundingSchema", () => {
  const base = {
    projectId: "50450d0e-1ae3-46cc-a46e-b29ea758757d",
    amountMinor: 1_800_000,
    currencyCode: "XOF",
    paymentMethodCode: "wave",
    fundingDate: "2026-08-11",
  };

  it("accepts a valid funding", () => {
    expect(createFundingSchema.safeParse(base).success).toBe(true);
  });

  it("rejects an unknown payment method code", () => {
    expect(createFundingSchema.safeParse({ ...base, paymentMethodCode: "paypal" }).success).toBe(
      false,
    );
  });

  it("rejects a zero or negative amount", () => {
    expect(createFundingSchema.safeParse({ ...base, amountMinor: 0 }).success).toBe(false);
    expect(createFundingSchema.safeParse({ ...base, amountMinor: -1 }).success).toBe(false);
  });

  it("rejects an invalid funding date", () => {
    expect(createFundingSchema.safeParse({ ...base, fundingDate: "not-a-date" }).success).toBe(
      false,
    );
  });
});
