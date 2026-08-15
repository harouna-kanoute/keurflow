"use client";

import { useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { removeAvatar, updateAvatar } from "./actions";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

function getInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function AvatarUpload({
  userId,
  displayName,
  phone,
  avatarSignedUrl,
}: {
  userId: string;
  displayName: string;
  phone: string | null;
  avatarSignedUrl: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // No client-side blob preview: the avatars bucket is private, so the only
  // valid src is a server-signed URL — a blob: object URL would need the
  // CSP's img-src to allow blob:, which it deliberately doesn't (§69). The
  // Server Action's revalidatePath already refreshes this prop with the new
  // signed URL once the upload completes.
  const currentUrl = avatarSignedUrl;

  const onFileChange = () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type) || file.size > MAX_BYTES) {
      setError("Format ou taille de fichier non supporté (JPEG/PNG/WEBP, 5 Mo max)");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const path = `${userId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file);

      if (uploadError) {
        setError("Une erreur est survenue. Veuillez réessayer.");
        return;
      }

      const result = await updateAvatar({ storagePath: path });
      if (result?.error) {
        setError(result.error);
        return;
      }

      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  };

  const onRemove = () => {
    setError(null);
    startTransition(async () => {
      const result = await removeAvatar();
      if (result?.error) setError(result.error);
    });
  };

  return (
    <div className="flex items-center gap-4">
      {currentUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- signed URLs expire; not worth Next/Image's optimization pipeline for a private, ephemeral avatar.
        <img
          src={currentUrl}
          alt=""
          className="h-16 w-16 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-100 text-lg font-semibold text-brand-700 dark:bg-brand-900 dark:text-brand-300">
          {getInitials(displayName)}
        </span>
      )}
      <div className="flex flex-col gap-2">
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-slate-50">{displayName}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {phone ? `WhatsApp : ${phone}` : "Aucun numéro WhatsApp renseigné"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() => fileInputRef.current?.click()}
            className="flex h-9 items-center justify-center rounded-full border border-slate-300 px-4 text-sm font-medium text-slate-900 transition-colors hover:border-slate-400 disabled:opacity-50 dark:border-slate-700 dark:text-slate-100 dark:hover:border-slate-600"
          >
            {isPending ? "…" : "Changer la photo"}
          </button>
          {currentUrl && (
            <button
              type="button"
              disabled={isPending}
              onClick={onRemove}
              className="flex h-9 items-center justify-center rounded-full px-4 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              Retirer
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_TYPES.join(",")}
          onChange={onFileChange}
          className="hidden"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
