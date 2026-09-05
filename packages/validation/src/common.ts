import { z } from "zod";
import { COUNTRIES, PAYMENT_METHODS } from "@keurflow/config";

export const uuidSchema = z.string().uuid();

// Re-validated server-side against the same list a country <select> is built
// from — never trust that a submitted code matches an option the UI offered.
const activeCountryCodes = new Set(COUNTRIES.filter((c) => c.active).map((c) => c.code));
export const countryCodeSchema = z
  .string()
  .length(2, "Pays invalide")
  .refine((code) => activeCountryCodes.has(code), "Pays invalide");

const activePaymentMethodCodes = new Set(
  PAYMENT_METHODS.filter((m) => m.active).map((m) => m.code),
);
export const paymentMethodCodeSchema = z
  .string()
  .refine((code) => activePaymentMethodCodes.has(code), "Moyen de paiement invalide");

// E.164-ish: optional leading +, 8-15 digits total, no spaces/dashes. Shared
// by the profile's WhatsApp number and supplier contact numbers so a number
// that works as a wa.me deep link in one place works in the other.
export const PHONE_REGEX = /^\+?[1-9]\d{7,14}$/;
export const PHONE_MESSAGE = "Numéro invalide. Utilisez le format international, ex. +221771234567";
export const phoneSchema = z.string().trim().regex(PHONE_REGEX, PHONE_MESSAGE);

// Amounts are always integers in the currency's minor unit — never floats.
export const amountMinorSchema = z.number().int().positive().max(1_000_000_000_00);

export const currencyCodeSchema = z.string().length(3).toUpperCase();

export const isoDateSchema = z.string().refine((v) => !Number.isNaN(Date.parse(v)), {
  message: "Date invalide",
});
