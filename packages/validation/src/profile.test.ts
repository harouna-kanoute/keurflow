import { describe, expect, it } from "vitest";
import {
  deleteAccountSchema,
  updateAvatarSchema,
  updateEmailSchema,
  updateProfileSchema,
} from "./profile";

describe("updateProfileSchema", () => {
  it("rejects a name shorter than 2 characters", () => {
    expect(updateProfileSchema.safeParse({ fullName: "A" }).success).toBe(false);
  });

  it("accepts a valid name", () => {
    expect(updateProfileSchema.safeParse({ fullName: "Harouna Niaka" }).success).toBe(true);
  });

  it("rejects a name longer than 120 characters", () => {
    expect(updateProfileSchema.safeParse({ fullName: "A".repeat(121) }).success).toBe(false);
  });
});

describe("updateAvatarSchema", () => {
  it("rejects an empty storage path", () => {
    expect(updateAvatarSchema.safeParse({ storagePath: "" }).success).toBe(false);
  });

  it("accepts a valid storage path", () => {
    expect(
      updateAvatarSchema.safeParse({ storagePath: "user-id/123-photo.jpg" }).success,
    ).toBe(true);
  });
});

describe("updateEmailSchema", () => {
  it("normalizes email casing", () => {
    const result = updateEmailSchema.safeParse({ email: "Test@Example.com" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("test@example.com");
  });

  it("rejects an invalid email", () => {
    expect(updateEmailSchema.safeParse({ email: "not-an-email" }).success).toBe(false);
  });
});

describe("deleteAccountSchema", () => {
  it("rejects a non-email confirmation value", () => {
    expect(deleteAccountSchema.safeParse({ confirmEmail: "not-an-email" }).success).toBe(false);
  });

  it("accepts a valid email", () => {
    expect(deleteAccountSchema.safeParse({ confirmEmail: "a@b.com" }).success).toBe(true);
  });
});
