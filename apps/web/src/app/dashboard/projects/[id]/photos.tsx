"use client";

import { useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { SubmitButton } from "@/components/submit-button";
import { useModalClose } from "@/components/modal";
import { attachPhoto } from "./actions";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const MAX_BYTES = 15 * 1024 * 1024;

export function UploadPhotoForm({ projectId }: { projectId: string }) {
  const close = useModalClose();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Choisissez une photo");
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type) || file.size > MAX_BYTES) {
      setError("Format ou taille de fichier non supporté");
      return;
    }

    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const path = `${projectId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("project-photos")
        .upload(path, file);

      if (uploadError) {
        setError("Une erreur est survenue. Veuillez réessayer.");
        return;
      }

      const result = await attachPhoto({
        projectId,
        caption: caption || undefined,
        mimeType: file.type as "image/jpeg" | "image/png" | "image/webp" | "image/heic",
        size: file.size,
        storagePath: path,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      if (fileInputRef.current) fileInputRef.current.value = "";
      setCaption("");
      close();
    });
  };

  return (
    <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3">
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        className="text-sm text-slate-700 dark:text-slate-300"
      />
      <input
        type="text"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Légende (optionnel)"
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <SubmitButton pending={isPending}>
        {isPending ? "Envoi…" : "Ajouter la photo"}
      </SubmitButton>
    </form>
  );
}

export function PhotoGallery({
  photos,
}: {
  photos: { id: string; url: string | null; caption: string | null }[];
}) {
  if (photos.length === 0) {
    return <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Aucune photo.</p>;
  }

  return (
    <div className="mt-2 grid grid-cols-3 gap-2">
      {photos.map((photo) =>
        photo.url ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed URLs expire; not worth Next/Image's optimization pipeline for private, ephemeral links.
          <img
            key={photo.id}
            src={photo.url}
            alt={photo.caption ?? ""}
            width={300}
            height={300}
            loading="lazy"
            decoding="async"
            className="aspect-square w-full rounded-lg object-cover"
          />
        ) : null,
      )}
    </div>
  );
}
