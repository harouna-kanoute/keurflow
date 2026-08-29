// Mirrors apps/web/src/app/dashboard/projects/[id]/project-tab-ids.ts — same
// 7 tabs, same order, so the two apps stay conceptually identical. Built up
// incrementally across Phase 1's PRs (see the mobile feature-parity plan) —
// only list a tab here once its panel actually exists, so this never ships
// a dead "coming soon" placeholder. Currently: PR 1 (Aperçu/Financements/
// Dépenses) + PR 2 (Étapes/Photos). Équipe/Rapports land in PR 3.
export const PROJECT_TABS = [
  { id: "apercu", label: "Aperçu" },
  { id: "financements", label: "Financements" },
  { id: "depenses", label: "Dépenses" },
  { id: "etapes", label: "Étapes" },
  { id: "photos", label: "Photos" },
] as const;

export type ProjectTabId = (typeof PROJECT_TABS)[number]["id"];
