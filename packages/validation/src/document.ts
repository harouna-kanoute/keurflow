import { z } from "zod";
import { DOCUMENT_TYPES } from "@keurflow/types";
import { uuidSchema } from "./common";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
] as const;

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB

export const uploadDocumentSchema = z.object({
  projectId: uuidSchema,
  documentType: z.enum(DOCUMENT_TYPES),
  filename: z.string().trim().min(1).max(255),
  mimeType: z.enum(ALLOWED_MIME_TYPES),
  size: z.number().int().positive().max(MAX_UPLOAD_BYTES),
  expenseId: uuidSchema.optional(),
  fundingId: uuidSchema.optional(),
});
export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;

export const uploadPhotoSchema = z.object({
  projectId: uuidSchema,
  milestoneId: uuidSchema.optional(),
  expenseId: uuidSchema.optional(),
  caption: z.string().trim().max(300).optional(),
  takenAt: z.string().optional(),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/heic"]),
  size: z.number().int().positive().max(MAX_UPLOAD_BYTES),
});
export type UploadPhotoInput = z.infer<typeof uploadPhotoSchema>;

export const deletePhotoSchema = z.object({
  photoId: uuidSchema,
});
export type DeletePhotoInput = z.infer<typeof deletePhotoSchema>;

export const deleteDocumentSchema = z.object({
  documentId: uuidSchema,
});
export type DeleteDocumentInput = z.infer<typeof deleteDocumentSchema>;
