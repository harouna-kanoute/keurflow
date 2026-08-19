import { describe, expect, it } from "vitest";
import {
  convertEurMinorToCfa,
  getBillingCurrency,
  getBillingCurrencyMinorUnit,
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

describe("getBillingCurrencyMinorUnit", () => {
  it("is 0 for CFA currencies", () => {
    expect(getBillingCurrencyMinorUnit("XOF")).toBe(0);
    expect(getBillingCurrencyMinorUnit("XAF")).toBe(0);
  });

  it("is 2 for EUR", () => {
    expect(getBillingCurrencyMinorUnit("EUR")).toBe(2);
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
