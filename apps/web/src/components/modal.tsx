"use client";

import { createContext, useContext, useRef } from "react";

// Forms rendered inside a Modal call useModalClose() to close it on success —
// a context, not a prop, because the modal's own close() is created
// client-side and Modal's `children` are often instantiated by a Server
// Component caller, which can't pass a function down as a prop.
const ModalCloseContext = createContext<(() => void) | null>(null);

export function useModalClose(): () => void {
  const close = useContext(ModalCloseContext);
  return close ?? (() => {});
}

type ModalVariant = "primary" | "secondary" | "ghost" | "banner" | "danger" | "icon" | "icon-danger";

const TRIGGER_CLASSES: Record<ModalVariant, string> = {
  primary:
    "flex h-9 items-center justify-center gap-1.5 rounded-full bg-brand-600 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600",
  secondary:
    "flex h-9 items-center justify-center gap-1.5 rounded-full border border-slate-300 px-4 text-sm font-medium text-slate-900 transition-colors hover:border-slate-400 dark:border-slate-700 dark:text-slate-100 dark:hover:border-slate-600",
  ghost:
    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100",
  // For placement on a colored surface (e.g. the dashboard header banner) —
  // inverted from `primary` so it stays legible against a brand-colored
  // background instead of disappearing into it.
  banner:
    "flex h-9 items-center justify-center gap-1.5 rounded-full bg-white px-4 text-sm font-medium text-brand-700 transition-colors hover:bg-white/90",
  danger:
    "flex h-9 items-center justify-center gap-1.5 rounded-full border border-red-300 px-4 text-sm font-medium text-red-700 transition-colors hover:border-red-400 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20",
  // Compact, icon-only triggers for inline row actions (e.g. edit/delete on
  // a dashboard list item) — no label text is rendered, see `iconOnly`.
  icon: "flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100",
  "icon-danger":
    "flex h-8 w-8 items-center justify-center rounded-full text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300",
};

// Native <dialog> gives us focus trapping, Escape-to-close and a ::backdrop
// for free — no client-side modal library needed for something this simple.
export function Modal({
  triggerLabel,
  triggerIcon,
  title,
  variant = "primary",
  iconOnly = false,
  children,
}: {
  triggerLabel: string;
  /** Replaces the default "+" prefix — e.g. a sidebar row icon. */
  triggerIcon?: React.ReactNode;
  title: string;
  variant?: ModalVariant;
  /** Hides triggerLabel visually (kept for a11y via aria-label) — pairs with variant="icon"/"icon-danger". */
  iconOnly?: boolean;
  children: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const open = () => dialogRef.current?.showModal();
  const close = () => dialogRef.current?.close();

  return (
    <>
      <button
        type="button"
        onClick={open}
        className={TRIGGER_CLASSES[variant]}
        aria-label={iconOnly ? triggerLabel : undefined}
      >
        {triggerIcon ?? (
          <span aria-hidden className="text-base leading-none">
            +
          </span>
        )}
        {iconOnly ? <span className="sr-only">{triggerLabel}</span> : triggerLabel}
      </button>
      <dialog
        ref={dialogRef}
        onClick={(e) => {
          if (e.target === dialogRef.current) close();
        }}
        className="fixed inset-0 m-auto max-h-[85vh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-lg backdrop:bg-slate-900/50 dark:border-slate-800 dark:bg-slate-900 dark:backdrop:bg-black/70"
      >
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{title}</h2>
          <button
            type="button"
            onClick={close}
            aria-label="Fermer"
            className="shrink-0 text-xl leading-none text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
          >
            ×
          </button>
        </div>
        <div className="mt-4">
          <ModalCloseContext.Provider value={close}>{children}</ModalCloseContext.Provider>
        </div>
      </dialog>
    </>
  );
}
