import { describe, expect, it } from "vitest";
import {
  convertDisplayAmountMinor,
  convertEurMinorToCfa,
  getBillingCurrency,
  getCurrencyMinorUnit,
  isCfaCurrency,
} from "./currency";

describe("isCfaCurrency", () => {
  it("is true for XOF and XAF", () => {
    expect(isCfaCurrency("XOF")).toBe(true);
    expect(isCfaCurrency("XAF")).toBe(true);
  });

  it("is false for EUR and other project currencies not enabled for billing", () => {
    expect(isCfaCurrency("EUR")).toBe(false);
    expect(isCfaCurrency("GNF")).toBe(false);
    expect(isCfaCurrency("MRU")).toBe(false);
    expect(isCfaCurrency("CDF")).toBe(false);
  });
});

describe("convertEurMinorToCfa", () => {
  it("converts EUR cents to whole francs at the fixed peg rate", () => {
    // 14,99€ * 655.957 = 9832.799... -> rounds to 9833
    expect(convertEurMinorToCfa(1499)).toBe(9833);
  });

  it("rounds to the nearest franc", () => {
    expect(convertEurMinorToCfa(3099)).toBe(20328); // 30,99€ * 655.957 = 20328.10...
  });

  it("is 0 for a free plan", () => {
    expect(convertEurMinorToCfa(0)).toBe(0);
  });
});

describe("getCurrencyMinorUnit", () => {
  it("is 0 for CFA currencies", () => {
    expect(getCurrencyMinorUnit("XOF")).toBe(0);
    expect(getCurrencyMinorUnit("XAF")).toBe(0);
  });

  it("is 2 for EUR and USD", () => {
    expect(getCurrencyMinorUnit("EUR")).toBe(2);
    expect(getCurrencyMinorUnit("USD")).toBe(2);
  });
});

describe("convertDisplayAmountMinor", () => {
  it("is a no-op when converting a currency to itself", () => {
    expect(convertDisplayAmountMinor(12345, "XOF", "XOF")).toBe(12345);
  });

  it("converts EUR to XOF at the fixed peg rate, matching convertEurMinorToCfa", () => {
    expect(convertDisplayAmountMinor(1499, "EUR", "XOF")).toBe(convertEurMinorToCfa(1499));
  });

  it("converts XOF back to EUR (round-trips close to the original, modulo rounding)", () => {
    const xof = convertDisplayAmountMinor(1499, "EUR", "XOF")!;
    const backToEur = convertDisplayAmountMinor(xof, "XOF", "EUR")!;
    expect(backToEur).toBeGreaterThanOrEqual(1497);
    expect(backToEur).toBeLessThanOrEqual(1501);
  });

  it("converts between the two CFA zones 1:1 (both pegged to EUR at the same rate)", () => {
    expect(convertDisplayAmountMinor(20328, "XOF", "XAF")).toBe(20328);
  });

  it("converts EUR to USD at the fixed rate", () => {
    // 14,99€ * 1.08 = 16.1892 -> rounds to 1619 cents
    expect(convertDisplayAmountMinor(1499, "EUR", "USD")).toBe(1619);
  });

  it("returns null for a currency this app never converts (e.g. GNF) rather than a wrong same-value fallback", () => {
    expect(convertDisplayAmountMinor(1000, "GNF", "EUR")).toBeNull();
    expect(convertDisplayAmountMinor(1000, "EUR", "GNF")).toBeNull();
  });
});

describe("getBillingCurrency", () => {
  it("is always EUR for individual accounts, even in a CFA-zone country", () => {
    expect(getBillingCurrency("individual", "XOF")).toBe("EUR");
    expect(getBillingCurrency("individual", "XAF")).toBe("EUR");
  });

  it("is the local currency for an agency in a CFA-zone country", () => {
    expect(getBillingCurrency("agency", "XOF")).toBe("XOF");
    expect(getBillingCurrency("company", "XAF")).toBe("XAF");
  });

  it("falls back to EUR for an agency outside the CFA zone", () => {
    expect(getBillingCurrency("agency", "GNF")).toBe("EUR");
    expect(getBillingCurrency("agency", null)).toBe("EUR");
  });
});
