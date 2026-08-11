import { describe, expect, it } from "vitest";
import { formatMoney, fromMajorUnits, toMinorUnits } from "./money";

describe("toMinorUnits", () => {
  it("scales by the currency's minor unit", () => {
    expect(toMinorUnits(25000, 2)).toBe(2_500_000);
    expect(toMinorUnits(25000, 0)).toBe(25_000);
  });

  it("rounds to the nearest integer minor unit", () => {
    expect(toMinorUnits(10.556, 2)).toBe(1056);
    expect(toMinorUnits(10.554, 2)).toBe(1055);
  });

  it("handles zero", () => {
    expect(toMinorUnits(0, 2)).toBe(0);
  });
});

describe("fromMajorUnits", () => {
  it("is the inverse of toMinorUnits for exact amounts", () => {
    expect(fromMajorUnits(2_500_000, 2)).toBe(25000);
    expect(fromMajorUnits(25_000, 0)).toBe(25000);
  });
});

describe("formatMoney", () => {
  it("shows no decimal digits for a zero-decimal currency (XOF)", () => {
    const formatted = formatMoney(15_000_000, "XOF", 0);
    expect(formatted).not.toMatch(/[.,]\d/);
    expect(formatted.replace(/\s/g, "")).toContain("15000000");
  });

  it("shows exactly two decimal digits for a two-decimal currency (EUR)", () => {
    const formatted = formatMoney(1_234_567, "EUR", 2);
    expect(formatted).toMatch(/,67(?!\d)/);
    expect(formatted).toContain("€");
  });

  it("formats zero without throwing", () => {
    expect(() => formatMoney(0, "EUR", 2)).not.toThrow();
  });
});
