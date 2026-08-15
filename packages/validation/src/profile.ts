import { z } from "zod";

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2, "2 caractères minimum").max(120, "120 caractères maximum"),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// Reuses profiles.phone as the WhatsApp contact number — nothing in the app
// renders it as a general "phone" today, so there's no dual-meaning risk.
// E.164-ish: optional leading +, 8-15 digits total, no spaces/dashes (kept
// simple since its only real consumer is a wa.me deep link).
export const whatsappNumberSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^\+?[1-9]\d{7,14}$/, "Numéro invalide. Utilisez le format international, ex. +221771234567"),
});
export type WhatsAppNumberInput = z.infer<typeof whatsappNumberSchema>;

// The storage path (bucket-relative), never a full URL — the avatars bucket
// is private, so display always goes through a freshly-signed URL generated
// server-side, not whatever's stored here.
export const updateAvatarSchema = z.object({
  storagePath: z.string().trim().min(1),
});
export type UpdateAvatarInput = z.infer<typeof updateAvatarSchema>;

export const updateEmailSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email invalide"),
});
export type UpdateEmailInput = z.infer<typeof updateEmailSchema>;

// confirmEmail is checked against the caller's own session email server-side
// (not just validated as a well-formed address) — the same "type the name to
// confirm" pattern already used for deleting a chantier.
export const deleteAccountSchema = z.object({
  confirmEmail: z.string().trim().toLowerCase().email(),
});
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
