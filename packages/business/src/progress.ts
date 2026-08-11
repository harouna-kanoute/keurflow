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

// "Projets en retard" on the agence dashboard (§10) — a project is late once
// its expected end date has passed and it hasn't been marked completed or
// archived. No expected_end_date means "not tracked as late", not an error.
export function isProjectDelayed(
  expectedEndDate: string | null,
  status: "planning" | "active" | "paused" | "completed" | "archived",
  today: Date = new Date(),
): boolean {
  if (!expectedEndDate) return false;
  if (status === "completed" || status === "archived") return false;
  return new Date(expectedEndDate).getTime() < today.getTime();
}
