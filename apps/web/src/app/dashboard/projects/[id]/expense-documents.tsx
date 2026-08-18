"use client";

import { useState, useTransition } from "react";
import { Modal, useModalClose } from "@/components/modal";
import { TrashIcon } from "@/components/icons";
import { deleteDocument } from "./actions";

export type ExpenseDocumentView = {
  id: string;
  filename: string;
  url: string | null;
  uploadedBy: string | null;
};

function DeleteDocumentForm({ documentId }: { documentId: string }) {
  const close = useModalClose();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mt-3 flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Ce document sera définitivement supprimé du chantier.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await deleteDocument({ documentId });
            if (result?.error) {
              setError(result.error);
              return;
            }
            close();
          })
        }
        className="flex h-10 items-center justify-center rounded-full bg-red-600 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50 dark:bg-red-700 dark:hover:bg-red-800"
      >
        {isPending ? "Suppression…" : "Supprimer le document"}
      </button>
    </div>
  );
}

export function ExpenseDocuments({
  documents,
  currentUserId,
  canManageAny,
}: {
  documents: ExpenseDocumentView[];
  currentUserId: string;
  canManageAny: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (documents.length === 0) return null;

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-medium text-slate-500 underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
      >
        {documents.length} document{documents.length > 1 ? "s" : ""}
      </button>

      {open && (
        <ul className="mt-2 flex flex-col gap-1.5">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs dark:bg-slate-800"
            >
              {doc.url ? (
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 truncate text-slate-700 hover:underline dark:text-slate-300"
                >
                  {doc.filename}
                </a>
              ) : (
                <span className="min-w-0 truncate text-slate-500 dark:text-slate-400">
                  {doc.filename}
                </span>
              )}
              {(canManageAny || doc.uploadedBy === currentUserId) && (
                <Modal
                  triggerLabel="Supprimer le document"
                  triggerIcon={<TrashIcon className="h-3.5 w-3.5" />}
                  title="Supprimer ce document ?"
                  variant="icon-danger"
                  iconOnly
                >
                  <DeleteDocumentForm documentId={doc.id} />
                </Modal>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
