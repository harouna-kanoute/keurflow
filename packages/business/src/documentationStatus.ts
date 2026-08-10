import type { DocumentationStatus } from "@keurflow/types";

// Derives the documentation status shown to the user (§32). Deliberately
// never returns anything implying fraud — absence of a receipt means
// "undocumented", not "fraudulent" (§32, §46, §107).
export function deriveDocumentationStatus(documentCount: number): DocumentationStatus {
  if (documentCount === 0) return "missing";
  if (documentCount === 1) return "partial";
  return "documented";
}

export const DOCUMENTATION_STATUS_LABEL: Record<DocumentationStatus, string> = {
  documented: "🟢 Documentée",
  partial: "🟠 Partiellement documentée",
  missing: "🔴 Non documentée",
};
