import { describe, expect, it } from "vitest";
import { getPasswordStrength } from "./passwordStrength";

describe("getPasswordStrength", () => {
  it("reports empty separately from weak, so the meter can stay blank", () => {
    const result = getPasswordStrength("");
    expect(result.level).toBe("empty");
    expect(result.score).toBe(0);
    expect(result.percent).toBe(0);
  });

  it("never scores a non-empty password at 0 — an empty-looking bar reads as broken", () => {
    expect(getPasswordStrength("a").score).toBe(1);
    expect(getPasswordStrength("a").percent).toBe(25);
  });

  it("keeps anything under the 8-character validation minimum at weak", () => {
    expect(getPasswordStrength("Ab3$x").level).toBe("weak");
  });

  it("grades by length and character variety", () => {
    expect(getPasswordStrength("motdepasse").level).toBe("fair");
    expect(getPasswordStrength("Motdepasse1").level).toBe("good");
    expect(getPasswordStrength("Motdepasse1!").level).toBe("strong");
  });

  it("reserves the top score for long passwords using all four character classes", () => {
    expect(getPasswordStrength("Motdepasse1!").score).toBe(4);
    expect(getPasswordStrength("Chantier2026").score).toBe(3);
  });

  it("refuses to reward a single repeated character, however long", () => {
    expect(getPasswordStrength("aaaaaaaaaaaaaaaaaaaa").level).toBe("weak");
  });

  it("refuses to reward a straight run, ascending or descending", () => {
    expect(getPasswordStrength("abcdefghijkl").level).toBe("weak");
    expect(getPasswordStrength("12345678").level).toBe("weak");
    expect(getPasswordStrength("lkjihgfedcba").level).toBe("weak");
  });

  it("caps a digits-only password at fair — length doesn't redeem a PIN", () => {
    expect(getPasswordStrength("123456789012").level).toBe("fair");
    expect(getPasswordStrength("849205718362").level).toBe("fair");
  });

  it("rewards a real passphrase on length, without demanding symbols", () => {
    expect(getPasswordStrength("chantier dakar plateau").level).toBe("strong");
  });

  it("caps a single-character-class password at good, however long", () => {
    expect(getPasswordStrength("chantierdakarplateau").level).toBe("good");
  });

  it("lists what is missing, and nothing once every rule is met", () => {
    expect(getPasswordStrength("court").missing).toContain("length");
    expect(getPasswordStrength("motdepasselongue").missing).toContain("case");
    expect(getPasswordStrength("Motdepasselongue").missing).toContain("digit");
    expect(getPasswordStrength("Motdepasse1").missing).toContain("symbol");
    expect(getPasswordStrength("Motdepasse1!").missing).toEqual([]);
  });

  it("treats accented and non-ASCII letters as symbols rather than ignoring them", () => {
    // Not ideal, but it must not crash or silently score them as nothing —
    // French passwords routinely contain é/à/ç.
    expect(getPasswordStrength("chantierdéjà").score).toBeGreaterThan(1);
  });

  it("percent always tracks score, so the bar and the label cannot disagree", () => {
    for (const password of ["", "a", "motdepasse", "Motdepasse1", "Motdepasse1!"]) {
      const { score, percent } = getPasswordStrength(password);
      expect(percent).toBe(score * 25);
    }
  });
});
