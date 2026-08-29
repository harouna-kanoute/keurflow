// Mirrors apps/web/src/app/dashboard/projects/[id]/project-tab-ids.ts — same
// 7 tabs, same order, so the two apps stay conceptually identical.
export const PROJECT_TABS = [
  { id: "apercu", label: "Aperçu" },
  { id: "financements", label: "Financements" },
  { id: "depenses", label: "Dépenses" },
  { id: "etapes", label: "Étapes" },
  { id: "photos", label: "Photos" },
  { id: "equipe", label: "Équipe" },
  { id: "rapports", label: "Rapports" },
] as const;

export type ProjectTabId = (typeof PROJECT_TABS)[number]["id"];
