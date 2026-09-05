// Plain module (no "use client") so the Server Component page can actually
// use PROJECT_TAB_IDS at runtime — every export of a "use client" file
// becomes an opaque client reference when imported from server code, which
// breaks a Server Component calling .includes() on it directly.
export type ProjectTabId =
  | "apercu"
  | "financements"
  | "depenses"
  | "fournisseurs"
  | "etapes"
  | "photos"
  | "membres"
  | "rapports";

// "Fournisseurs" sits right after "Dépenses" — a purchase is read as the
// documented side of a spend, and the tab holds both the supplier directory
// and the purchases, rather than adding two entries to an already-long bar.
export const TABS: { id: ProjectTabId; label: string }[] = [
  { id: "apercu", label: "Aperçu" },
  { id: "financements", label: "Financements" },
  { id: "depenses", label: "Dépenses" },
  { id: "fournisseurs", label: "Fournisseurs" },
  { id: "etapes", label: "Étapes" },
  { id: "photos", label: "Photos" },
  { id: "membres", label: "Équipe" },
  { id: "rapports", label: "Rapports" },
];

export const PROJECT_TAB_IDS: readonly ProjectTabId[] = TABS.map((t) => t.id);
