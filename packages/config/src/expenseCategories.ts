export interface ExpenseCategoryDef {
  code: string;
  label: string;
}

export const EXPENSE_CATEGORIES: readonly ExpenseCategoryDef[] = [
  { code: "materials", label: "Matériaux" },
  { code: "labor", label: "Main d'œuvre" },
  { code: "transport", label: "Transport" },
  { code: "equipment", label: "Équipement" },
  { code: "administration", label: "Administratif" },
  { code: "architecture", label: "Architecture" },
  { code: "electricity", label: "Électricité" },
  { code: "plumbing", label: "Plomberie" },
  { code: "masonry", label: "Maçonnerie" },
  { code: "carpentry", label: "Menuiserie" },
  { code: "finishing", label: "Finitions" },
  { code: "other", label: "Autre" },
] as const;
