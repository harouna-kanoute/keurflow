import { z } from "zod";
import { PHONE_MESSAGE, PHONE_REGEX } from "./common";

// Reuses profiles.phone as the WhatsApp contact number — nothing in the app
// renders it as a general "phone" today, so there's no dual-meaning risk.
// The pattern itself now lives in common.ts, shared with supplier contacts.
const WHATSAPP_PHONE_REGEX = PHONE_REGEX;
const WHATSAPP_PHONE_MESSAGE = PHONE_MESSAGE;

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2, "2 caractères minimum").max(120, "120 caractères maximum"),
  // Editable later from Settings, separately from the mandatory prompt shown
  // during invite acceptance. The form clears the field to `undefined` (via
  // setValueAs) before an empty string would otherwise fail this regex, so
  // "no value" reaches the server as omitted, not as a validation error.
  phone: z.string().trim().regex(WHATSAPP_PHONE_REGEX, WHATSAPP_PHONE_MESSAGE).optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const whatsappNumberSchema = z.object({
  phone: z.string().trim().regex(WHATSAPP_PHONE_REGEX, WHATSAPP_PHONE_MESSAGE),
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
