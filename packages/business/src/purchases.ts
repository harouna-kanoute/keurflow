export interface PurchaseAmountLike {
  quantity: number;
  unitPriceMinor: number;
}

// Single source of truth for quantity × unit price, shared by the client
// (live total while typing) and the server (which recomputes before insert).
// The DB trigger purchases_recompute_total mirrors this and has the final
// word — a client-submitted total is never persisted.
export function calculatePurchaseTotalMinor(purchase: PurchaseAmountLike): number {
  return Math.round(purchase.quantity * purchase.unitPriceMinor);
}

export interface RecordedPriceSample {
  materialCode: string;
  materialName?: string | null;
  unit: string;
  currencyCode: string;
  unitPriceMinor: number;
}

export interface RecordedAveragePrice {
  materialCode: string;
  materialName: string | null;
  unit: string;
  currencyCode: string;
  averageUnitPriceMinor: number;
  sampleCount: number;
}

// Below this, an "average" is just the last price wearing a disguise.
export const MIN_PRICE_SAMPLES = 2;

// Averages what THIS tenant actually recorded — never presented as a market
// price (§6: "Prix moyen enregistré dans KeurFlow"). Grouped by material +
// unit + currency so sacks are never averaged with tonnes, or XOF with EUR.
export function recordedAveragePrices(
  samples: readonly RecordedPriceSample[],
  minSamples: number = MIN_PRICE_SAMPLES,
): RecordedAveragePrice[] {
  const groups = new Map<string, { sample: RecordedPriceSample; total: number; count: number }>();

  for (const sample of samples) {
    const name = sample.materialCode === "other" ? (sample.materialName?.trim() ?? "") : "";
    const key = [sample.materialCode, name, sample.unit, sample.currencyCode].join("|");
    const existing = groups.get(key);
    if (existing) {
      existing.total += sample.unitPriceMinor;
      existing.count += 1;
    } else {
      groups.set(key, { sample, total: sample.unitPriceMinor, count: 1 });
    }
  }

  return [...groups.values()]
    .filter((g) => g.count >= minSamples)
    .map((g) => ({
      materialCode: g.sample.materialCode,
      materialName: g.sample.materialName ?? null,
      unit: g.sample.unit,
      currencyCode: g.sample.currencyCode,
      averageUnitPriceMinor: Math.round(g.total / g.count),
      sampleCount: g.count,
    }))
    .sort((a, b) => b.sampleCount - a.sampleCount);
}
