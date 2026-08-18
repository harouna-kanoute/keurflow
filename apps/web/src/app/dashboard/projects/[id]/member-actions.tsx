"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  updateProjectMemberRoleSchema,
  type UpdateProjectMemberRoleInput,
} from "@keurflow/validation";
import { FormSelect } from "@/components/form-select";
import { SubmitButton } from "@/components/submit-button";
import { Modal, useModalClose } from "@/components/modal";
import { EditIcon, TrashIcon } from "@/components/icons";
import { updateProjectMemberRole, removeProjectMember } from "./actions";

const ROLE_LABELS: Record<string, string> = {
  project_manager: "Responsable",
  project_approver: "Propriétaire du chantier",
  project_member: "Collaborateur",
  project_viewer: "Client (lecture seule)",
};

function EditMemberRoleForm({
  memberId,
  currentRole,
}: {
  memberId: string;
  currentRole: string;
}) {
  const close = useModalClose();
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<UpdateProjectMemberRoleInput>({
    resolver: zodResolver(updateProjectMemberRoleSchema),
    defaultValues: { memberId, role: currentRole as UpdateProjectMemberRoleInput["role"] },
  });

  const onSubmit = handleSubmit((data) => {
    startTransition(async () => {
      const result = await updateProjectMemberRole(data);
      if (result?.error) {
        setError("root", { message: result.error });
        return;
      }
      close();
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="mt-3 flex flex-col gap-3">
      <input type="hidden" {...register("memberId")} />
      <FormSelect
        id="editMemberRole"
        label="Rôle"
        defaultValue={currentRole}
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
      <SubmitButton pending={isPending}>{isPending ? "Enregistrement…" : "Enregistrer"}</SubmitButton>
    </form>
  );
}

function RemoveMemberForm({ memberId, memberName }: { memberId: string; memberName: string }) {
  const close = useModalClose();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mt-3 flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        <strong className="text-slate-900 dark:text-slate-100">{memberName}</strong> perdra l&apos;accès
        à ce chantier. Cette personne pourra être réinvitée plus tard si besoin.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await removeProjectMember({ memberId });
            if (result?.error) {
              setError(result.error);
              return;
            }
            close();
          })
        }
        className="flex h-10 items-center justify-center rounded-full bg-red-600 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50 dark:bg-red-700 dark:hover:bg-red-800"
      >
        {isPending ? "Retrait…" : "Retirer du chantier"}
      </button>
    </div>
  );
}

export function MemberRowActions({
  memberId,
  memberName,
  role,
  canManage,
}: {
  memberId: string;
  memberName: string;
  role: string;
  canManage: boolean;
}) {
  // The owner row (creator's own membership) is never editable/removable
  // from here — see updateProjectMemberRole/removeProjectMember.
  if (!canManage || role === "project_owner") return null;

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Modal
        triggerLabel={`Modifier le rôle de ${memberName}`}
        triggerIcon={<EditIcon className="h-4 w-4" />}
        title="Modifier le rôle"
        variant="icon"
        iconOnly
      >
        <EditMemberRoleForm memberId={memberId} currentRole={role} />
      </Modal>
      <Modal
        triggerLabel={`Retirer ${memberName} du chantier`}
        triggerIcon={<TrashIcon className="h-4 w-4" />}
        title="Retirer ce membre"
        variant="icon-danger"
        iconOnly
      >
        <RemoveMemberForm memberId={memberId} memberName={memberName} />
      </Modal>
    </div>
  );
}
