import { z } from "zod";
import { COUNTRIES } from "@keurflow/config";

export const uuidSchema = z.string().uuid();

// Re-validated server-side against the same list a country <select> is built
// from — never trust that a submitted code matches an option the UI offered.
const activeCountryCodes = new Set(COUNTRIES.filter((c) => c.active).map((c) => c.code));
export const countryCodeSchema = z
  .string()
  .length(2, "Pays invalide")
  .refine((code) => activeCountryCodes.has(code), "Pays invalide");

// Amounts are always integers in the currency's minor unit — never floats.
export const amountMinorSchema = z.number().int().positive().max(1_000_000_000_00);

export const currencyCodeSchema = z.string().length(3).toUpperCase();

export const isoDateSchema = z.string().refine((v) => !Number.isNaN(Date.parse(v)), {
  message: "Date invalide",
});
