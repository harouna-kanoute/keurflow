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

// An agency manages the chantier day-to-day and invites its actual owner
// (the client, often abroad) to follow along — the reverse of an individual
// owner, who invites a collaborator to act on the ground for them. Both are
// still plain project_members roles under the hood; only the
// framing/default/label order here differs by organization type (see
// page.tsx's isAgencyOrg — organizations.type === "agency" | "company").
//
// The owner defaults to project_approver, not project_viewer: they need to
// approve/reject/request-info on expenses and generate reports, which
// project_viewer can't do. project_approver is deliberately NOT
// project_manager — that would also hand them member management (invite,
// change roles, remove), which is the agency's job, not the client's. A
// plain project_manager ("Responsable") is still offered for the agency's
// own internal staff, and a pure read-only "Client" tier for owners who
// genuinely only want to watch.
const AGENCY_ROLE_LABELS: Record<string, string> = {
  project_approver: "Propriétaire du chantier",
  project_manager: "Responsable",
  project_member: "Collaborateur",
  project_viewer: "Client (lecture seule)",
};

const INDIVIDUAL_ROLE_LABELS: Record<string, string> = {
  project_member: "Collaborateur",
  project_manager: "Responsable",
  project_viewer: "Client (lecture seule)",
};

export function InviteMemberForm({
  projectId,
  isAgencyOrg,
}: {
  projectId: string;
  isAgencyOrg: boolean;
}) {
  const close = useModalClose();
  const [isPending, startTransition] = useTransition();
  const defaultRole = isAgencyOrg ? "project_approver" : "project_member";
  const roleLabels = isAgencyOrg ? AGENCY_ROLE_LABELS : INDIVIDUAL_ROLE_LABELS;
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<InviteProjectMemberInput>({
    resolver: zodResolver(inviteProjectMemberSchema),
    defaultValues: { projectId, role: defaultRole },
  });

  const onSubmit = handleSubmit((data) => {
    startTransition(async () => {
      const result = await inviteProjectMember(data);
      if (result?.error) {
        setError("root", { message: result.error });
        return;
      }
      reset({ projectId, role: defaultRole });
      close();
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="mt-3 flex flex-col gap-3">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        {isAgencyOrg
          ? "Il pourra suivre l'avancement du chantier à distance, valider les dépenses (approuver, rejeter, demander des précisions) et générer des rapports."
          : "Il pourra suivre le chantier sur le terrain et documenter les dépenses pour vous."}
      </p>
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
        defaultValue={defaultRole}
        error={errors.role?.message}
        {...register("role")}
      >
        {Object.entries(roleLabels).map(([value, label]) => (
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
