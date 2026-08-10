import { z } from "zod";

export const uuidSchema = z.string().uuid();

// Amounts are always integers in the currency's minor unit — never floats.
export const amountMinorSchema = z.number().int().positive().max(1_000_000_000_00);

export const currencyCodeSchema = z.string().length(3).toUpperCase();

export const isoDateSchema = z.string().refine((v) => !Number.isNaN(Date.parse(v)), {
  message: "Date invalide",
});
