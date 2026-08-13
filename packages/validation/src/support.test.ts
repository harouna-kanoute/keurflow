import { describe, expect, it } from "vitest";
import { createSupportTicketSchema } from "./support";

describe("createSupportTicketSchema", () => {
  const base = {
    category: "bug" as const,
    subject: "Le bouton Enregistrer ne répond plus",
    description: "Rien ne se passe quand je clique sur Enregistrer sur la page de facturation.",
  };

  it("accepts a valid ticket", () => {
    expect(createSupportTicketSchema.safeParse(base).success).toBe(true);
  });

  it("accepts the security category", () => {
    expect(createSupportTicketSchema.safeParse({ ...base, category: "security" }).success).toBe(
      true,
    );
  });

  it("rejects an unknown category", () => {
    expect(createSupportTicketSchema.safeParse({ ...base, category: "feature_request" }).success).toBe(
      false,
    );
  });

  it("rejects a too-short subject", () => {
    expect(createSupportTicketSchema.safeParse({ ...base, subject: "Hi" }).success).toBe(false);
  });

  it("rejects a too-short description", () => {
    expect(createSupportTicketSchema.safeParse({ ...base, description: "Bug." }).success).toBe(
      false,
    );
  });

  it("makes organizationId and pageUrl optional", () => {
    expect(createSupportTicketSchema.safeParse(base).success).toBe(true);
  });
});
