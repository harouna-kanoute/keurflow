import { describe, expect, it } from "vitest";
import {
  createOrganizationSchema,
  inviteOrganizationMemberSchema,
  updateOrganizationSchema,
} from "./organization";

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

describe("updateOrganizationSchema", () => {
  const organizationId = "50450d0e-1ae3-46cc-a46e-b29ea758757d";

  it("accepts a name with no contact details", () => {
    expect(
      updateOrganizationSchema.safeParse({ organizationId, name: "Ma maison" }).success,
    ).toBe(true);
  });

  it("accepts valid contact details alongside the name", () => {
    expect(
      updateOrganizationSchema.safeParse({
        organizationId,
        name: "Ma maison",
        address: "Dakar, Sénégal",
        phone: "+221771234567",
        email: "contact@exemple.com",
      }).success,
    ).toBe(true);
  });

  it("rejects an invalid email", () => {
    expect(
      updateOrganizationSchema.safeParse({
        organizationId,
        name: "Ma maison",
        email: "not-an-email",
      }).success,
    ).toBe(false);
  });

  it("rejects a phone that's too short", () => {
    expect(
      updateOrganizationSchema.safeParse({ organizationId, name: "Ma maison", phone: "123" })
        .success,
    ).toBe(false);
  });
});
