import { describe, expect, it } from "vitest";
import { getMilestoneProgressPercent } from "./progress";

describe("getMilestoneProgressPercent", () => {
  it("returns 0 for no milestones, not NaN or an error", () => {
    expect(getMilestoneProgressPercent([])).toBe(0);
  });

  it("computes a rounded percentage of completed milestones", () => {
    const milestones = [
      { status: "completed" as const },
      { status: "completed" as const },
      { status: "in_progress" as const },
    ];
    expect(getMilestoneProgressPercent(milestones)).toBe(67);
  });

  it("is 100 when every milestone is completed", () => {
    expect(
      getMilestoneProgressPercent([{ status: "completed" as const }, { status: "completed" as const }]),
    ).toBe(100);
  });

  it("delayed milestones don't count as progress", () => {
    expect(getMilestoneProgressPercent([{ status: "delayed" as const }])).toBe(0);
  });
});
