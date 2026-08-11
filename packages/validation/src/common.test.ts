import { describe, expect, it } from "vitest";
import {
  amountMinorSchema,
  countryCodeSchema,
  currencyCodeSchema,
  isoDateSchema,
  uuidSchema,
} from "./common";

describe("countryCodeSchema", () => {
  it("accepts an active country code", () => {
    expect(countryCodeSchema.safeParse("SN").success).toBe(true);
  });

  it("rejects an inactive country code (Cap-Vert)", () => {
    expect(countryCodeSchema.safeParse("CV").success).toBe(false);
  });

  it("rejects a code that isn't in the list at all", () => {
    expect(countryCodeSchema.safeParse("ZZ").success).toBe(false);
  });

  it("rejects wrong-length input", () => {
    expect(countryCodeSchema.safeParse("S").success).toBe(false);
    expect(countryCodeSchema.safeParse("SEN").success).toBe(false);
  });
});

describe("amountMinorSchema", () => {
  it("accepts a positive integer", () => {
    expect(amountMinorSchema.safeParse(2_500_000).success).toBe(true);
  });

  it("rejects zero and negative amounts", () => {
    expect(amountMinorSchema.safeParse(0).success).toBe(false);
    expect(amountMinorSchema.safeParse(-100).success).toBe(false);
  });

  it("rejects non-integers — money is always an integer minor-unit amount", () => {
    expect(amountMinorSchema.safeParse(100.5).success).toBe(false);
  });

  it("rejects amounts above the sanity ceiling", () => {
    expect(amountMinorSchema.safeParse(1_000_000_000_01).success).toBe(false);
  });
});

describe("uuidSchema", () => {
  it("accepts a well-formed UUID", () => {
    expect(uuidSchema.safeParse("50450d0e-1ae3-46cc-a46e-b29ea758757d").success).toBe(true);
  });

  it("rejects a non-UUID string, e.g. a guessed sequential id", () => {
    expect(uuidSchema.safeParse("1").success).toBe(false);
    expect(uuidSchema.safeParse("not-a-uuid").success).toBe(false);
  });
});

describe("currencyCodeSchema", () => {
  it("uppercases a lowercase code", () => {
    const result = currencyCodeSchema.safeParse("eur");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("EUR");
  });

  it("rejects the wrong length", () => {
    expect(currencyCodeSchema.safeParse("EU").success).toBe(false);
  });
});

describe("isoDateSchema", () => {
  it("accepts a valid ISO date", () => {
    expect(isoDateSchema.safeParse("2026-08-11").success).toBe(true);
  });

  it("rejects garbage input", () => {
    expect(isoDateSchema.safeParse("not-a-date").success).toBe(false);
  });
});
