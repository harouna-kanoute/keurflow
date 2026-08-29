// Mirrors apps/web/src/app/dashboard/projects/[id]/page.tsx's
// MILESTONE_STATUS_LABELS/_COLORS and the expense status equivalent.
export const MILESTONE_LABELS: Record<string, string> = {
  pending: "À faire",
  in_progress: "En cours",
  completed: "Terminée",
  delayed: "En retard",
};

export const MILESTONE_TONES: Record<string, "neutral" | "amber" | "success" | "danger"> = {
  pending: "neutral",
  in_progress: "amber",
  completed: "success",
  delayed: "danger",
};

export const EXPENSE_STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  needs_information: "Info requise",
  approved: "Approuvée",
  rejected: "Rejetée",
};

export const EXPENSE_TONES: Record<string, "neutral" | "amber" | "success" | "danger"> = {
  pending: "neutral",
  needs_information: "amber",
  approved: "success",
  rejected: "danger",
};
