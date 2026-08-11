"use client";

import { useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { inviteProjectMemberSchema, type InviteProjectMemberInput } from "@keurflow/validation";
import { FormField } from "@/components/form-field";
import { FormSelect } from "@/components/form-select";
import { SubmitButton } from "@/components/submit-button";
import { useModalClose } from "@/components/modal";
import { inviteProjectMember } from "./actions";

const ROLE_LABELS: Record<string, string> = {
  project_manager: "Responsable",
  project_member: "Collaborateur",
  project_viewer: "Client (lecture seule)",
};

export function InviteMemberForm({ projectId }: { projectId: string }) {
  const close = useModalClose();
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<InviteProjectMemberInput>({
    resolver: zodResolver(inviteProjectMemberSchema),
    defaultValues: { projectId, role: "project_viewer" },
  });

  const onSubmit = handleSubmit((data) => {
    startTransition(async () => {
      const result = await inviteProjectMember(data);
      if (result?.error) {
        setError("root", { message: result.error });
        return;
      }
      reset({ projectId, role: "project_viewer" });
      close();
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="mt-3 flex flex-col gap-3">
      <input type="hidden" {...register("projectId")} />
      <FormField
        id="inviteEmail"
        label="Email"
        type="email"
        placeholder="nom@exemple.com"
        error={errors.email?.message}
        {...register("email")}
      />
      <FormSelect
        id="inviteRole"
        label="Rôle"
        defaultValue="project_viewer"
        error={errors.role?.message}
        {...register("role")}
      >
        {Object.entries(ROLE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </FormSelect>
      {errors.root && <p className="text-sm text-red-600">{errors.root.message}</p>}
      <SubmitButton pending={isPending}>{isPending ? "Invitation…" : "Inviter"}</SubmitButton>
    </form>
  );
}
