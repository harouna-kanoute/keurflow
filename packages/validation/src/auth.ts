import { z } from "zod";
import { ORGANIZATION_TYPES } from "@keurflow/types";
import { countryCodeSchema } from "./common";

const emailSchema = z.string().trim().toLowerCase().email("Email invalide");

// Matches Supabase Auth's own minimum — enforced again here so the form gives
// immediate feedback instead of waiting on a round-trip to reject a weak password.
const passwordSchema = z.string().min(8, "8 caractères minimum");

export const signUpSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "2 caractères minimum")
      .max(120, "120 caractères maximum"),
    email: emailSchema,
    organizationType: z.enum(ORGANIZATION_TYPES),
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

// Matches supabase-js's EmailOtpType — verified via a Server Action (never a
// bare GET) so that email-link prescanning (Gmail, corporate mail filters,
// etc.) visiting the link can't burn the one-time token before the real
// user clicks "Confirmer" (spec: invite links expiring before use).
export const verifyEmailOtpSchema = z.object({
  tokenHash: z.string().min(1),
  type: z.enum(["signup", "invite", "magiclink", "recovery", "email", "email_change"]),
  next: z.string().optional(),
});
export type VerifyEmailOtpInput = z.infer<typeof verifyEmailOtpSchema>;
