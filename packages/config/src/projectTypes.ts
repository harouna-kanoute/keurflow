export interface ProjectTypeDef {
  code: string;
  label: string;
}

export const PROJECT_TYPES: readonly ProjectTypeDef[] = [
  { code: "construction", label: "Construction" },
  { code: "renovation", label: "Rénovation" },
  { code: "extension", label: "Extension" },
  { code: "other", label: "Autre" },
] as const;
