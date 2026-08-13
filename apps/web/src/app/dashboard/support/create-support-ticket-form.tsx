"use client";

import { useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { createSupportTicketSchema, type CreateSupportTicketInput } from "@keurflow/validation";
import { FormField } from "@/components/form-field";
import { FormSelect } from "@/components/form-select";
import { FormTextarea } from "@/components/form-textarea";
import { SubmitButton } from "@/components/submit-button";
import { createSupportTicket } from "./actions";

const CATEGORIES = [
  { value: "bug", label: "Bug" },
  { value: "security", label: "Faille de sécurité" },
  { value: "other", label: "Autre problème" },
];

export function CreateSupportTicketForm({ organizationId }: { organizationId: string | null }) {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
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

  const onSubmit = handleSubmit((data) => {
    startTransition(async () => {
      const result = await createSupportTicket({
        ...data,
        organizationId: organizationId ?? undefined,
        pageUrl: pathname,
      });
      if (result?.error) {
        setError("root", { message: result.error });
        return;
      }
      reset({ category: "bug", subject: "", description: "" });
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
