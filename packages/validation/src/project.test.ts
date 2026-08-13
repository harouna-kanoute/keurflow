import { describe, expect, it } from "vitest";
import {
  createProjectSchema,
  inviteProjectMemberSchema,
  removeProjectMemberSchema,
  updateProjectMemberRoleSchema,
} from "./project";

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

  it("accepts an expected end date on or after the start date", () => {
    expect(
      createProjectSchema.safeParse({
        ...base,
        startDate: "2026-01-01",
        expectedEndDate: "2026-01-01",
      }).success,
    ).toBe(true);
    expect(
      createProjectSchema.safeParse({
        ...base,
        startDate: "2026-01-01",
        expectedEndDate: "2026-12-31",
      }).success,
    ).toBe(true);
  });

  it("rejects an expected end date before the start date", () => {
    expect(
      createProjectSchema.safeParse({
        ...base,
        startDate: "2026-06-01",
        expectedEndDate: "2026-01-01",
      }).success,
    ).toBe(false);
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

describe("updateProjectMemberRoleSchema", () => {
  it("excludes 'project_owner' as an assignable role", () => {
    expect(
      updateProjectMemberRoleSchema.safeParse({
        memberId: "50450d0e-1ae3-46cc-a46e-b29ea758757d",
        role: "project_owner",
      }).success,
    ).toBe(false);
  });

  it("accepts a valid role change", () => {
    expect(
      updateProjectMemberRoleSchema.safeParse({
        memberId: "50450d0e-1ae3-46cc-a46e-b29ea758757d",
        role: "project_manager",
      }).success,
    ).toBe(true);
  });
});

describe("removeProjectMemberSchema", () => {
  it("requires a valid memberId", () => {
    expect(removeProjectMemberSchema.safeParse({ memberId: "not-a-uuid" }).success).toBe(false);
  });

  it("accepts a valid memberId", () => {
    expect(
      removeProjectMemberSchema.safeParse({ memberId: "50450d0e-1ae3-46cc-a46e-b29ea758757d" })
        .success,
    ).toBe(true);
  });
});
