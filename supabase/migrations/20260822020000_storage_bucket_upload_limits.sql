-- SECURITY FIX (medium): none of the Storage buckets set file_size_limit or
-- allowed_mime_types, so the size/type checks in the Zod schemas
-- (uploadDocumentSchema/uploadPhotoSchema, packages/validation/src/document.ts;
-- the inline ALLOWED_TYPES/MAX_BYTES constants in avatar-upload.tsx and
-- create-support-ticket-form.tsx) only ever apply to the metadata row insert
-- *after* the fact — never to the bytes already sitting in Storage, since
-- every upload happens directly from the browser via
-- supabase.storage.from(bucket).upload(...), not through a Server Action.
-- Any authenticated member of a bucket could bypass the client JS entirely
-- (devtools, or a raw REST call with their own JWT) and upload a file of
-- arbitrary size or type. Enforcing the same limits at the bucket level
-- closes that gap regardless of what the client sends.
update storage.buckets set
  file_size_limit = 5 * 1024 * 1024,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'avatars';

update storage.buckets set
  file_size_limit = 15 * 1024 * 1024,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
where id = 'project-photos';

update storage.buckets set
  file_size_limit = 15 * 1024 * 1024,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
where id in ('project-documents', 'funding-proofs', 'expense-receipts');

update storage.buckets set
  file_size_limit = 5 * 1024 * 1024,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'support-attachments';
