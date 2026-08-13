import { describe, expect, it } from "vitest";
import { signInSchema, signUpSchema, updatePasswordSchema, verifyEmailOtpSchema } from "./auth";

describe("signUpSchema", () => {
  const base = {
    fullName: "Harouna Test",
    email: "harouna@example.com",
    organizationType: "individual",
    countryCode: "SN",
    password: "TestPass1234!",
    confirmPassword: "TestPass1234!",
  };

  it("accepts matching passwords", () => {
    expect(signUpSchema.safeParse(base).success).toBe(true);
  });

  it("rejects mismatched password confirmation", () => {
    const result = signUpSchema.safeParse({ ...base, confirmPassword: "Different1234!" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("confirmPassword"))).toBe(true);
    }
  });

  it("rejects a password shorter than 8 characters", () => {
    expect(
      signUpSchema.safeParse({ ...base, password: "short1!", confirmPassword: "short1!" })
        .success,
    ).toBe(false);
  });

  it("rejects an inactive/unknown country code — never trusts the client's <select> alone", () => {
    expect(signUpSchema.safeParse({ ...base, countryCode: "ZZ" }).success).toBe(false);
  });

  it("accepts each valid organization type", () => {
    for (const organizationType of ["individual", "agency", "company"]) {
      expect(signUpSchema.safeParse({ ...base, organizationType }).success).toBe(true);
    }
  });

  it("rejects an organization type outside the allow-list", () => {
    expect(signUpSchema.safeParse({ ...base, organizationType: "nonprofit" }).success).toBe(false);
  });

  it("normalizes email casing", () => {
    const result = signUpSchema.safeParse({ ...base, email: "Harouna@Example.com" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("harouna@example.com");
  });
});

describe("signInSchema", () => {
  it("requires a non-empty password but doesn't enforce the 8-char minimum", () => {
    // A pre-existing account may predate any password policy change — sign-in
    // must not lock people out for having an "old" (shorter) password.
    expect(signInSchema.safeParse({ email: "a@b.com", password: "short" }).success).toBe(true);
    expect(signInSchema.safeParse({ email: "a@b.com", password: "" }).success).toBe(false);
  });
});

describe("updatePasswordSchema", () => {
  it("rejects mismatched confirmation", () => {
    expect(
      updatePasswordSchema.safeParse({ password: "TestPass1234!", confirmPassword: "Nope1234!" })
        .success,
    ).toBe(false);
  });
});

describe("verifyEmailOtpSchema", () => {
  it("accepts each supabase-js EmailOtpType", () => {
    for (const type of ["signup", "invite", "magiclink", "recovery", "email", "email_change"]) {
      expect(verifyEmailOtpSchema.safeParse({ tokenHash: "abc123", type }).success).toBe(true);
    }
  });

  it("rejects an empty token hash", () => {
    expect(verifyEmailOtpSchema.safeParse({ tokenHash: "", type: "invite" }).success).toBe(false);
  });

  it("rejects an unknown type", () => {
    expect(verifyEmailOtpSchema.safeParse({ tokenHash: "abc123", type: "oauth" }).success).toBe(
      false,
    );
  });
});
