"use client";

import { useRef, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { createSupportTicketSchema, type CreateSupportTicketInput } from "@keurflow/validation";
import { createClient } from "@/lib/supabase/client";
import { FormField } from "@/components/form-field";
import { FormSelect } from "@/components/form-select";
import { FormTextarea } from "@/components/form-textarea";
import { SubmitButton } from "@/components/submit-button";
import { CloseIcon, ReceiptIcon } from "@/components/icons";
import { createSupportTicket } from "./actions";

const CATEGORIES = [
  { value: "bug", label: "Bug" },
  { value: "security", label: "Faille de sécurité" },
  { value: "other", label: "Autre problème" },
];

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_FILES = 4;

export function CreateSupportTicketForm({
  userId,
  organizationId,
}: {
  userId: string;
  organizationId: string | null;
}) {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<CreateSupportTicketInput>({
    resolver: zodResolver(createSupportTicketSchema),
    defaultValues: { category: "bug" },
  });

  const onFilesPicked = () => {
    const picked = Array.from(fileInputRef.current?.files ?? []);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (picked.length === 0) return;

    if (files.length + picked.length > MAX_FILES) {
      setFileError(`${MAX_FILES} captures maximum`);
      return;
    }
    const invalid = picked.find(
      (f) => !ALLOWED_TYPES.includes(f.type) || f.size > MAX_BYTES,
    );
    if (invalid) {
      setFileError("Format ou taille de fichier non supporté (JPEG/PNG/WEBP, 5 Mo max)");
      return;
    }

    setFileError(null);
    setFiles((prev) => [...prev, ...picked]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = handleSubmit((data) => {
    startTransition(async () => {
      const supabase = createClient();
      const attachmentPaths: string[] = [];
      for (const file of files) {
        const path = `${userId}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("support-attachments")
          .upload(path, file);
        if (uploadError) {
          setError("root", { message: "Une erreur est survenue. Veuillez réessayer." });
          return;
        }
        attachmentPaths.push(path);
      }

      const result = await createSupportTicket({
        ...data,
        organizationId: organizationId ?? undefined,
        pageUrl: pathname,
        attachmentPaths: attachmentPaths.length ? attachmentPaths : undefined,
      });
      if (result?.error) {
        setError("root", { message: result.error });
        return;
      }
      reset({ category: "bug", subject: "", description: "" });
      setFiles([]);
      setSubmitted(true);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <FormSelect
        id="ticketCategory"
        label="Type de problème"
        defaultValue="bug"
        error={errors.category?.message}
        {...register("category")}
      >
        {CATEGORIES.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </FormSelect>
      <FormField
        id="ticketSubject"
        label="Sujet"
        placeholder="Ex : Le bouton Enregistrer ne répond plus"
        error={errors.subject?.message}
        {...register("subject")}
      />
      <FormTextarea
        id="ticketDescription"
        label="Description"
        placeholder="Décrivez ce qui s'est passé, ce que vous attendiez, et comment reproduire le problème si possible."
        rows={5}
        error={errors.description?.message}
        {...register("description")}
      />
      <div>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Captures d&apos;écran (optionnel)
        </p>
        {files.length > 0 && (
          <ul className="mt-2 flex flex-col gap-1.5">
            {files.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:text-slate-300"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <ReceiptIcon className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="truncate">{file.name}</span>
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  aria-label={`Retirer ${file.name}`}
                  className="shrink-0 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                >
                  <CloseIcon className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {files.length < MAX_FILES && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-2 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-slate-400 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600"
          >
            + Ajouter une capture
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_TYPES.join(",")}
          multiple
          onChange={onFilesPicked}
          className="hidden"
        />
        {fileError && <p className="mt-1.5 text-sm text-red-600">{fileError}</p>}
      </div>
      {errors.root && <p className="text-sm text-red-600">{errors.root.message}</p>}
      {submitted && !errors.root && (
        <p className="text-sm text-green-700 dark:text-green-400">
          Merci, votre signalement a bien été envoyé.
        </p>
      )}
      <SubmitButton pending={isPending}>{isPending ? "Envoi…" : "Envoyer le signalement"}</SubmitButton>
    </form>
  );
}
