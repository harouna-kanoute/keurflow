import { describe, expect, it } from "vitest";
import { createProjectSchema, inviteProjectMemberSchema } from "./project";

describe("createProjectSchema", () => {
  const base = {
    organizationId: "50450d0e-1ae3-46cc-a46e-b29ea758757d",
    name: "Construction maison familiale",
    projectType: "construction",
    countryCode: "SN",
    budgetMinor: 2_500_000,
    currencyCode: "EUR",
  };

  it("accepts a valid project", () => {
    expect(createProjectSchema.safeParse(base).success).toBe(true);
  });

  it("rejects an inactive/unknown country code", () => {
    expect(createProjectSchema.safeParse({ ...base, countryCode: "ZZ" }).success).toBe(false);
  });

  it("rejects a zero or negative budget", () => {
    expect(createProjectSchema.safeParse({ ...base, budgetMinor: 0 }).success).toBe(false);
    expect(createProjectSchema.safeParse({ ...base, budgetMinor: -1 }).success).toBe(false);
  });

  it("makes description/city/dates optional", () => {
    expect(createProjectSchema.safeParse(base).success).toBe(true);
  });
});

describe("inviteProjectMemberSchema", () => {
  it("excludes 'project_owner' as an invitable role", () => {
    expect(
      inviteProjectMemberSchema.safeParse({
        projectId: "50450d0e-1ae3-46cc-a46e-b29ea758757d",
        email: "a@b.com",
        role: "project_owner",
      }).success,
    ).toBe(false);
  });

  it("accepts a valid invite", () => {
    expect(
      inviteProjectMemberSchema.safeParse({
        projectId: "50450d0e-1ae3-46cc-a46e-b29ea758757d",
        email: "a@b.com",
        role: "project_viewer",
      }).success,
    ).toBe(true);
  });
});
