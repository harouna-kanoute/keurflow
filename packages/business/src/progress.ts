export interface MilestoneLike {
  status: "pending" | "in_progress" | "completed" | "delayed";
}

// Project progression shown on the particulier dashboard (§47) — percentage
// of milestones marked completed. A project with no milestones yet reads as
// 0%, not an error.
export function getMilestoneProgressPercent(milestones: readonly MilestoneLike[]): number {
  if (milestones.length === 0) return 0;
  const completed = milestones.filter((m) => m.status === "completed").length;
  return Math.round((completed / milestones.length) * 100);
}
