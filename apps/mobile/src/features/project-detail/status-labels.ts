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

// Hand-ported from web's page.tsx PROJECT_ROLE_LABELS — identical wording is
// duplicated in 4 places on web itself (page.tsx, actions.ts, dashboard
// page.tsx, member-actions.tsx) with nothing exported from packages/* to
// import instead, so mirroring the literal map here is the correct move.
export const PROJECT_ROLE_LABELS: Record<string, string> = {
  project_owner: "Propriétaire",
  project_manager: "Responsable",
  project_approver: "Propriétaire du chantier",
  project_member: "Collaborateur",
  project_viewer: "Client (lecture seule)",
};
