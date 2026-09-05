export interface MaterialDef {
  code: string;
  label: string;
  /** Unit pre-selected when this material is picked — still overridable. */
  defaultUnit: string;
}

// Same shape and intent as EXPENSE_CATEGORIES: a short shared list, not a
// catalog table. "other" carries a free-text material name on the purchase
// row, which keeps the long tail out of this list without a curation burden.
export const MATERIALS: readonly MaterialDef[] = [
  { code: "cement", label: "Ciment", defaultUnit: "sac" },
  { code: "steel", label: "Fer", defaultUnit: "kg" },
  { code: "sand", label: "Sable", defaultUnit: "m³" },
  { code: "gravel", label: "Gravier", defaultUnit: "m³" },
  { code: "bricks", label: "Briques", defaultUnit: "pièce" },
  { code: "blocks", label: "Parpaings", defaultUnit: "pièce" },
  { code: "paint", label: "Peinture", defaultUnit: "litre" },
  { code: "tiles", label: "Carrelage", defaultUnit: "m²" },
  { code: "pipes", label: "Tuyaux", defaultUnit: "pièce" },
  { code: "electrical_cables", label: "Câbles électriques", defaultUnit: "m" },
  { code: "wood", label: "Bois", defaultUnit: "pièce" },
  { code: "doors", label: "Portes", defaultUnit: "pièce" },
  { code: "windows", label: "Fenêtres", defaultUnit: "pièce" },
  { code: "other", label: "Autre", defaultUnit: "pièce" },
] as const;

export const MATERIAL_LABELS = new Map(MATERIALS.map((m) => [m.code, m.label]));

/** Display name for a purchase: the custom name when the code is "other". */
export function materialDisplayName(code: string, customName?: string | null): string {
  if (code === "other") return customName?.trim() || "Autre";
  return MATERIAL_LABELS.get(code) ?? code;
}
