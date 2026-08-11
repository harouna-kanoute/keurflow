import { describe, expect, it } from "vitest";
import { createOrganizationSchema, inviteOrganizationMemberSchema } from "./organization";

describe("createOrganizationSchema", () => {
  it("accepts a valid individual organization", () => {
    expect(
      createOrganizationSchema.safeParse({
        name: "Ma maison",
        type: "individual",
        countryCode: "SN",
      }).success,
    ).toBe(true);
  });

  it("rejects an invalid organization type", () => {
    expect(
      createOrganizationSchema.safeParse({
        name: "Ma maison",
        type: "nonprofit",
        countryCode: "SN",
      }).success,
    ).toBe(false);
  });
});

describe("inviteOrganizationMemberSchema", () => {
  it("excludes 'owner' as an invitable role — ownership isn't granted by invite", () => {
    expect(
      inviteOrganizationMemberSchema.safeParse({
        organizationId: "50450d0e-1ae3-46cc-a46e-b29ea758757d",
        email: "a@b.com",
        role: "owner",
      }).success,
    ).toBe(false);
  });

  it("accepts a valid invite", () => {
    expect(
      inviteOrganizationMemberSchema.safeParse({
        organizationId: "50450d0e-1ae3-46cc-a46e-b29ea758757d",
        email: "a@b.com",
        role: "member",
      }).success,
    ).toBe(true);
  });
});
