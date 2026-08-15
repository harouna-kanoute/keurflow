import { describe, expect, it } from "vitest";
import {
  deleteAccountSchema,
  updateAvatarSchema,
  updateEmailSchema,
  updateProfileSchema,
  whatsappNumberSchema,
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

describe("whatsappNumberSchema", () => {
  it("accepts an international number with a leading +", () => {
    expect(whatsappNumberSchema.safeParse({ phone: "+221771234567" }).success).toBe(true);
  });

  it("accepts an international number without a leading +", () => {
    expect(whatsappNumberSchema.safeParse({ phone: "221771234567" }).success).toBe(true);
  });

  it("rejects a number without a country code", () => {
    expect(whatsappNumberSchema.safeParse({ phone: "0771234567" }).success).toBe(false);
  });

  it("rejects a number with spaces or dashes", () => {
    expect(whatsappNumberSchema.safeParse({ phone: "+221 77 123 45 67" }).success).toBe(false);
  });

  it("rejects a non-numeric value", () => {
    expect(whatsappNumberSchema.safeParse({ phone: "not-a-phone" }).success).toBe(false);
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
