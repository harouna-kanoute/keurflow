"use client";

import { useRef } from "react";
import { Modal, type ModalHandle } from "@/components/modal";

function getInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function MemberProfileTrigger({
  fullName,
  phone,
  avatarSignedUrl,
  roleLabel,
  invited,
}: {
  fullName: string;
  phone: string | null;
  avatarSignedUrl: string | null;
  roleLabel: string;
  invited: boolean;
}) {
  const modalRef = useRef<ModalHandle>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => modalRef.current?.open()}
        className="flex min-w-0 items-center gap-3 text-left"
      >
        {avatarSignedUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed URL expires; not worth Next/Image's optimization pipeline for a private, ephemeral avatar.
          <img
            src={avatarSignedUrl}
            alt=""
            className="h-9 w-9 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700 dark:bg-brand-900 dark:text-brand-300">
            {getInitials(fullName)}
          </span>
        )}
        <span className="min-w-0 truncate text-slate-900 hover:underline dark:text-slate-100">
          {fullName}
          {invited && (
            <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">(invité·e)</span>
          )}
        </span>
      </button>

      <Modal ref={modalRef} hideTrigger triggerLabel={`Profil de ${fullName}`} title="Profil" variant="secondary">
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          {avatarSignedUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed URL expires; not worth Next/Image's optimization pipeline for a private, ephemeral avatar.
            <img src={avatarSignedUrl} alt="" className="h-20 w-20 rounded-full object-cover" />
          ) : (
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-100 text-xl font-semibold text-brand-700 dark:bg-brand-900 dark:text-brand-300">
              {getInitials(fullName)}
            </span>
          )}
          <div>
            <p className="text-base font-semibold text-slate-900 dark:text-slate-50">
              {fullName}
              {invited && (
                <span className="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400">
                  (invité·e)
                </span>
              )}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{roleLabel}</p>
          </div>
          {phone ? (
            <a
              href={`https://wa.me/${phone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-10 items-center justify-center rounded-full bg-brand-600 px-5 text-sm font-medium text-white transition-colors hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600"
            >
              Contacter sur WhatsApp
            </a>
          ) : (
            <p className="text-sm text-slate-400 dark:text-slate-600">
              Aucun numéro WhatsApp renseigné
            </p>
          )}
        </div>
      </Modal>
    </>
  );
}
