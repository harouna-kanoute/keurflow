"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Modal, type ModalHandle } from "@/components/modal";
import { UsersIcon } from "@/components/icons";
import {
  getProjectTeamMembers,
  type ProjectTeamMember,
} from "@/app/dashboard/projects/[id]/actions";

function getInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function MemberAvatar({ url, name, size }: { url: string | null; name: string; size: "sm" | "lg" }) {
  const dimension = size === "sm" ? "h-9 w-9 text-xs" : "h-20 w-20 text-xl";
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- signed URL expires; not worth Next/Image's optimization pipeline for a private, ephemeral avatar.
      <img src={url} alt="" className={`${dimension} shrink-0 rounded-full object-cover`} />
    );
  }
  return (
    <span
      className={`flex ${dimension} shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700 dark:bg-brand-900 dark:text-brand-300`}
    >
      {getInitials(name)}
    </span>
  );
}

// The sidebar's quick way to see who's on a chantier without leaving the
// current page — the full roster (invite/edit role/remove) still lives on
// the project page's own Équipe tab, linked at the bottom of this popup.
// A single dialog swaps between the list and the selected member's profile
// rather than stacking a second <dialog> on top, since nested native
// dialogs render inconsistently across browsers.
export function TeamModal({ projectId, onNavigate }: { projectId: string; onNavigate?: () => void }) {
  const modalRef = useRef<ModalHandle>(null);
  const [members, setMembers] = useState<ProjectTeamMember[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<ProjectTeamMember | null>(null);

  const open = () => {
    setSelected(null);
    modalRef.current?.open();
    if (members !== null || loading) return;
    setLoading(true);
    setError(null);
    getProjectTeamMembers(projectId).then((result) => {
      setLoading(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      setMembers(result.data ?? []);
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
      >
        <UsersIcon className="h-5 w-5 shrink-0" />
        <span className="flex-1 text-left">Équipe</span>
      </button>

      <Modal
        ref={modalRef}
        hideTrigger
        triggerLabel="Équipe"
        title={selected ? "Profil" : "Équipe du chantier"}
        variant="secondary"
      >
        {selected ? (
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="self-start text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            >
              ← Retour
            </button>
            <MemberAvatar url={selected.avatarSignedUrl} name={selected.fullName} size="lg" />
            <div>
              <p className="text-base font-semibold text-slate-900 dark:text-slate-50">
                {selected.fullName}
                {selected.invited && (
                  <span className="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400">
                    (invité·e)
                  </span>
                )}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{selected.roleLabel}</p>
            </div>
            {selected.phone ? (
              <a
                href={`https://wa.me/${selected.phone.replace(/\D/g, "")}`}
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
        ) : (
          <>
            {loading && <p className="text-sm text-slate-500 dark:text-slate-400">Chargement…</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}
            {members && members.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400">Aucun membre.</p>
            )}
            {members && members.length > 0 && (
              <ul className="flex flex-col gap-2">
                {members.map((member) => (
                  <li key={member.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(member)}
                      className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2 text-left text-sm transition-colors hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <MemberAvatar url={member.avatarSignedUrl} name={member.fullName} size="sm" />
                        <span className="min-w-0 truncate text-slate-900 dark:text-slate-100">
                          {member.fullName}
                          {member.invited && (
                            <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                              (invité·e)
                            </span>
                          )}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                        {member.roleLabel}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href={`/dashboard/projects/${projectId}?tab=membres`}
              onClick={() => {
                modalRef.current?.close();
                onNavigate?.();
              }}
              className="mt-4 block text-center text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
            >
              Gérer l&apos;équipe →
            </Link>
          </>
        )}
      </Modal>
    </>
  );
}
