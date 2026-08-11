import { z } from "zod";
import { COUNTRIES } from "@keurflow/config";

const emailSchema = z.string().trim().toLowerCase().email("Email invalide");

// Matches Supabase Auth's own minimum — enforced again here so the form gives
// immediate feedback instead of waiting on a round-trip to reject a weak password.
const passwordSchema = z.string().min(8, "8 caractères minimum");

// Re-validated server-side against the same list a country <select> is built
// from — never trust that the submitted code matches an option the UI offered.
const activeCountryCodes = new Set(COUNTRIES.filter((c) => c.active).map((c) => c.code));
const countryCodeSchema = z
  .string()
  .length(2, "Pays invalide")
  .refine((code) => activeCountryCodes.has(code), "Pays invalide");

export const signUpSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "2 caractères minimum")
      .max(120, "120 caractères maximum"),
    email: emailSchema,
    countryCode: countryCodeSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });
export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Mot de passe requis"),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const requestPasswordResetSchema = z.object({
  email: emailSchema,
});
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;

export const updatePasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
