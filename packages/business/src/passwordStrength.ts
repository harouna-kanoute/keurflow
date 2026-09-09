// Password strength scoring, shared so mobile and web grade a password the
// same way. Deliberately rule-based rather than a full entropy estimator
// (zxcvbn and friends ship a multi-megabyte dictionary — far too much weight
// for a signup form, and most of it English word lists that say little about
// the French and Wolof passwords our users actually pick).
//
// This only ever *encourages* a stronger password. The rule that decides
// whether a password is accepted at all lives in @keurflow/validation
// (8 characters minimum) — nothing here blocks a submission.

export type PasswordStrengthLevel = "empty" | "weak" | "fair" | "good" | "strong";

/** What the password is still missing, so the UI can say how to improve it. */
export type PasswordStrengthHint = "length" | "case" | "digit" | "symbol";

export type PasswordStrength = {
  level: PasswordStrengthLevel;
  /** 0 when empty, otherwise 1-4. Drives the meter's fill. */
  score: number;
  /** score * 25, ready for a percentage-based progress bar. */
  percent: number;
  /** Unmet recommendations, in the order worth suggesting them. */
  missing: PasswordStrengthHint[];
};

/** Length at which we stop nudging for a longer password. */
const COMFORTABLE_LENGTH = 12;

// A run of one repeated character ("aaaaaaaaaaaa") or a straight keyboard/
// alphabet/digit run ("abcdefgh", "12345678") is trivially guessable however
// long it is, so it must never score above "weak" on length alone.
function isTrivialPattern(password: string): boolean {
  if (password.length < 3) return true;

  // Spread rather than index, so a surrogate pair counts as one character.
  const chars = [...password];
  const first = chars[0];
  if (first !== undefined && chars.every((c) => c === first)) return true;

  let ascending = true;
  let descending = true;
  for (let i = 1; i < password.length; i++) {
    const step = password.charCodeAt(i) - password.charCodeAt(i - 1);
    if (step !== 1) ascending = false;
    if (step !== -1) descending = false;
  }
  return ascending || descending;
}

export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return { level: "empty", score: 0, percent: 0, missing: ["length", "case", "digit", "symbol"] };
  }

  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const variety = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;

  const missing: PasswordStrengthHint[] = [];
  if (password.length < COMFORTABLE_LENGTH) missing.push("length");
  if (!(hasLower && hasUpper)) missing.push("case");
  if (!hasDigit) missing.push("digit");
  if (!hasSymbol) missing.push("symbol");

  let score = 1;
  // Meeting the validation minimum is worth one step, no more.
  if (password.length >= 8) score++;
  // Then either real length, or enough variety to make up for being shorter.
  if (password.length >= COMFORTABLE_LENGTH || (password.length >= 8 && variety >= 3)) score++;
  // The top step needs both: long *and* every character class.
  if (password.length >= COMFORTABLE_LENGTH && variety === 4) score++;
  // A genuine passphrase earns the top step on length alone, as long as it
  // isn't a single character class.
  if (password.length >= 20 && variety >= 2) score = 4;

  // Digits only is a PIN however long it is — no amount of length makes
  // "123456789012" more than a number someone can guess.
  if (/^\d+$/.test(password)) score = Math.min(score, 2);

  // Length alone shouldn't carry a password that is one character repeated or
  // a straight run, and nothing below the validation minimum should read as
  // anything but weak.
  if (isTrivialPattern(password) || password.length < 8) score = 1;

  score = Math.max(1, Math.min(4, score));

  const level: PasswordStrengthLevel =
    score === 1 ? "weak" : score === 2 ? "fair" : score === 3 ? "good" : "strong";

  return { level, score, percent: score * 25, missing };
}
