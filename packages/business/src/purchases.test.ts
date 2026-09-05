import { describe, expect, it } from "vitest";
import { calculatePurchaseTotalMinor, recordedAveragePrices } from "./purchases";

describe("calculatePurchaseTotalMinor", () => {
  it("multiplies quantity by unit price", () => {
    // 50 sacs × 5 500 XOF (0 decimals) = 275 000
    expect(calculatePurchaseTotalMinor({ quantity: 50, unitPriceMinor: 5500 })).toBe(275000);
  });

  it("rounds fractional quantities to an integer minor amount", () => {
    expect(calculatePurchaseTotalMinor({ quantity: 2.5, unitPriceMinor: 333 })).toBe(833);
  });
});

describe("recordedAveragePrices", () => {
  const sample = (unitPriceMinor: number, overrides = {}) => ({
    materialCode: "cement",
    unit: "sac",
    currencyCode: "XOF",
    unitPriceMinor,
    ...overrides,
  });

  it("averages the unit prices recorded for one material", () => {
    const results = recordedAveragePrices([sample(5000), sample(6000)]);
    expect(results).toHaveLength(1);
    expect(results[0]?.averageUnitPriceMinor).toBe(5500);
    expect(results[0]?.sampleCount).toBe(2);
  });

  it("hides a material with too few samples to average", () => {
    expect(recordedAveragePrices([sample(5000)])).toEqual([]);
  });

  it("never mixes units — a sack price is not averaged with a tonne price", () => {
    const results = recordedAveragePrices([
      sample(5000),
      sample(6000),
      sample(90000, { unit: "tonne" }),
      sample(100000, { unit: "tonne" }),
    ]);
    expect(results).toHaveLength(2);
    expect(results.find((r) => r.unit === "sac")?.averageUnitPriceMinor).toBe(5500);
    expect(results.find((r) => r.unit === "tonne")?.averageUnitPriceMinor).toBe(95000);
  });

  it("never mixes currencies", () => {
    const results = recordedAveragePrices([
      sample(5000),
      sample(6000),
      sample(800, { currencyCode: "EUR" }),
      sample(900, { currencyCode: "EUR" }),
    ]);
    expect(results.map((r) => r.currencyCode).sort()).toEqual(["EUR", "XOF"]);
  });

  it("groups custom materials by their name, not just the 'other' code", () => {
    const results = recordedAveragePrices([
      sample(1000, { materialCode: "other", materialName: "Chaux" }),
      sample(2000, { materialCode: "other", materialName: "Chaux" }),
      sample(7000, { materialCode: "other", materialName: "Colle" }),
      sample(9000, { materialCode: "other", materialName: "Colle" }),
    ]);
    expect(results).toHaveLength(2);
    expect(results.find((r) => r.materialName === "Chaux")?.averageUnitPriceMinor).toBe(1500);
    expect(results.find((r) => r.materialName === "Colle")?.averageUnitPriceMinor).toBe(8000);
  });
});
