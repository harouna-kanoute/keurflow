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

  it("accepts up to 4 attachment paths", () => {
    expect(
      createSupportTicketSchema.safeParse({
        ...base,
        attachmentPaths: ["a/1.png", "a/2.png", "a/3.png", "a/4.png"],
      }).success,
    ).toBe(true);
  });

  it("rejects more than 4 attachment paths", () => {
    expect(
      createSupportTicketSchema.safeParse({
        ...base,
        attachmentPaths: ["a/1.png", "a/2.png", "a/3.png", "a/4.png", "a/5.png"],
      }).success,
    ).toBe(false);
  });
});
