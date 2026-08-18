"use client";

import { useState, useTransition } from "react";
import { Modal, useModalClose } from "@/components/modal";
import { TrashIcon } from "@/components/icons";
import { deleteSupportAttachment } from "./actions";

export type TicketAttachment = { path: string; url: string | null };

function DeleteAttachmentForm({ ticketId, path }: { ticketId: string; path: string }) {
  const close = useModalClose();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mt-3 flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Cette pièce jointe sera définitivement supprimée du signalement.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await deleteSupportAttachment({ ticketId, path });
            if (result?.error) {
              setError(result.error);
              return;
            }
            close();
          })
        }
        className="flex h-10 items-center justify-center rounded-full bg-red-600 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50 dark:bg-red-700 dark:hover:bg-red-800"
      >
        {isPending ? "Suppression…" : "Supprimer la pièce jointe"}
      </button>
    </div>
  );
}

export function TicketAttachments({
  ticketId,
  attachments,
}: {
  ticketId: string;
  attachments: TicketAttachment[];
}) {
  if (attachments.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {attachments.map(({ path, url }) =>
        url ? (
          <div key={path} className="relative">
            <a href={url} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element -- signed URL expires; not worth Next/Image's optimization pipeline for a private, ephemeral attachment. */}
              <img
                src={url}
                alt="Capture d'écran jointe au signalement"
                className="h-16 w-16 rounded-lg border border-slate-200 object-cover dark:border-slate-700"
              />
            </a>
            <div className="absolute -top-1.5 -right-1.5 rounded-full bg-white shadow-sm dark:bg-slate-900">
              <Modal
                triggerLabel="Supprimer la pièce jointe"
                triggerIcon={<TrashIcon className="h-3 w-3" />}
                title="Supprimer cette pièce jointe ?"
                variant="icon-danger"
                iconOnly
              >
                <DeleteAttachmentForm ticketId={ticketId} path={path} />
              </Modal>
            </div>
          </div>
        ) : null,
      )}
    </div>
  );
}
