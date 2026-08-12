"use client";

import { EditIcon, TrashIcon } from "@/components/icons";
import { Modal } from "@/components/modal";
import { DeleteProjectForm } from "./projects/[id]/delete-project-form";
import { EditProjectForm } from "./edit-project-form";

export function ProjectActionsMenu({
  projectId,
  projectName,
  currencyCode,
  editDefaults,
  canEdit,
  canDelete,
}: {
  projectId: string;
  projectName: string;
  currencyCode: string;
  editDefaults: {
    name: string;
    projectType: string;
    budgetMinor: number;
    address: string | null;
    surfaceArea: number | null;
  };
  canEdit: boolean;
  canDelete: boolean;
}) {
  if (!canEdit && !canDelete) return null;

  return (
    // Row actions live inside a Link in some layouts — stop the click from
    // also triggering the surrounding row's navigation.
    <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
      {canEdit && (
        <Modal
          triggerLabel="Modifier le chantier"
          triggerIcon={<EditIcon className="h-4 w-4" />}
          title="Modifier le chantier"
          variant="icon"
          iconOnly
        >
          <EditProjectForm
            projectId={projectId}
            currencyCode={currencyCode}
            defaultValues={editDefaults}
          />
        </Modal>
      )}
      {canDelete && (
        <Modal
          triggerLabel="Supprimer le chantier"
          triggerIcon={<TrashIcon className="h-4 w-4" />}
          title="Supprimer le chantier"
          variant="icon-danger"
          iconOnly
        >
          <DeleteProjectForm projectId={projectId} projectName={projectName} />
        </Modal>
      )}
    </div>
  );
}
