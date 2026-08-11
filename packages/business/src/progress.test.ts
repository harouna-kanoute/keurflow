import { describe, expect, it } from "vitest";
import { getMilestoneProgressPercent, isProjectDelayed } from "./progress";

const today = new Date("2026-08-11T00:00:00Z");

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

describe("isProjectDelayed", () => {
  it("is true once the expected end date has passed and the project is still active", () => {
    expect(isProjectDelayed("2026-08-01", "active", today)).toBe(true);
  });

  it("is false with no expected end date — not tracked as late, not an error", () => {
    expect(isProjectDelayed(null, "active", today)).toBe(false);
  });

  it("is false once completed or archived, even past the expected end date", () => {
    expect(isProjectDelayed("2026-08-01", "completed", today)).toBe(false);
    expect(isProjectDelayed("2026-08-01", "archived", today)).toBe(false);
  });

  it("is false when the expected end date is still in the future", () => {
    expect(isProjectDelayed("2026-12-01", "active", today)).toBe(false);
  });
});
