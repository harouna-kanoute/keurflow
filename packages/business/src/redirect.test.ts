import { describe, expect, it } from "vitest";
import { isSafeRedirectPath } from "./redirect";

describe("isSafeRedirectPath", () => {
  it("accepts a plain internal path", () => {
    expect(isSafeRedirectPath("/dashboard")).toBe(true);
    expect(isSafeRedirectPath("/dashboard/billing?checkout=success")).toBe(true);
  });

  it("rejects absolute URLs", () => {
    expect(isSafeRedirectPath("https://evil.example")).toBe(false);
    expect(isSafeRedirectPath("http://evil.example")).toBe(false);
  });

  it("rejects protocol-relative URLs", () => {
    expect(isSafeRedirectPath("//evil.example")).toBe(false);
    expect(isSafeRedirectPath("/\\evil.example")).toBe(false);
  });

  it("rejects the userinfo-injection bypass (no leading slash)", () => {
    expect(isSafeRedirectPath("@evil.example")).toBe(false);
  });

  it("rejects empty, null, and undefined", () => {
    expect(isSafeRedirectPath("")).toBe(false);
    expect(isSafeRedirectPath(null)).toBe(false);
    expect(isSafeRedirectPath(undefined)).toBe(false);
  });
});
