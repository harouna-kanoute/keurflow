"use client";

import { useEffect, useRef, useState } from "react";
import { EditIcon, MoreIcon, TrashIcon } from "@/components/icons";
import { Modal, type ModalHandle } from "@/components/modal";
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
    description: string | null;
    projectType: string;
    city: string | null;
    budgetMinor: number;
    address: string | null;
    surfaceArea: number | null;
    startDate: string | null;
    expectedEndDate: string | null;
  };
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const editModalRef = useRef<ModalHandle>(null);
  const deleteModalRef = useRef<ModalHandle>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  if (!canEdit && !canDelete) return null;

  return (
    // Row actions live inside a Link in some layouts — stop the click from
    // also triggering the surrounding row's navigation.
    <div ref={menuRef} className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        aria-label={`Actions pour ${projectName}`}
        aria-expanded={menuOpen}
        className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
      >
        <MoreIcon className="h-4.5 w-4.5" />
      </button>

      {menuOpen && (
        <div className="absolute right-0 z-10 mt-1 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-left shadow-lg dark:border-slate-800 dark:bg-slate-900">
          {canEdit && (
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                editModalRef.current?.open();
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <EditIcon className="h-4 w-4" />
              Modifier
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                deleteModalRef.current?.open();
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <TrashIcon className="h-4 w-4" />
              Supprimer
            </button>
          )}
        </div>
      )}

      {canEdit && (
        <Modal ref={editModalRef} hideTrigger triggerLabel="Modifier le chantier" title="Modifier le chantier">
          <EditProjectForm
            projectId={projectId}
            currencyCode={currencyCode}
            defaultValues={editDefaults}
          />
        </Modal>
      )}
      {canDelete && (
        <Modal ref={deleteModalRef} hideTrigger triggerLabel="Supprimer le chantier" title="Supprimer le chantier">
          <DeleteProjectForm projectId={projectId} projectName={projectName} />
        </Modal>
      )}
    </div>
  );
}
