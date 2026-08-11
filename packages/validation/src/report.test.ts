import { describe, expect, it } from "vitest";
import { createReportSchema } from "./report";

describe("createReportSchema", () => {
  const base = {
    projectId: "50450d0e-1ae3-46cc-a46e-b29ea758757d",
    periodStart: "2026-08-01",
    periodEnd: "2026-08-31",
  };

  it("accepts a valid period", () => {
    expect(createReportSchema.safeParse(base).success).toBe(true);
  });

  it("rejects a period end before the period start", () => {
    expect(
      createReportSchema.safeParse({ ...base, periodStart: "2026-08-31", periodEnd: "2026-08-01" })
        .success,
    ).toBe(false);
  });
});
