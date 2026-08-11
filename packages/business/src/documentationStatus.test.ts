import { describe, expect, it } from "vitest";
import { DOCUMENTATION_STATUS_LABEL, deriveDocumentationStatus } from "./documentationStatus";

describe("deriveDocumentationStatus", () => {
  it("is missing with zero documents", () => {
    expect(deriveDocumentationStatus(0)).toBe("missing");
  });

  it("is partial with exactly one document", () => {
    expect(deriveDocumentationStatus(1)).toBe("partial");
  });

  it("is documented with two or more documents", () => {
    expect(deriveDocumentationStatus(2)).toBe("documented");
    expect(deriveDocumentationStatus(5)).toBe("documented");
  });
});

describe("DOCUMENTATION_STATUS_LABEL", () => {
  it("never implies fraud, only documentation completeness (§32, §46, §107)", () => {
    for (const label of Object.values(DOCUMENTATION_STATUS_LABEL)) {
      expect(label.toLowerCase()).not.toContain("fraude");
    }
  });
});
