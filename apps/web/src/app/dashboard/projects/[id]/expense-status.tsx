"use client";

import { useTransition } from "react";
import { updateExpenseStatus } from "./actions";

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  needs_information: "Info requise",
  approved: "Approuvée",
  rejected: "Rejetée",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  needs_information: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

export function ExpenseStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status] ?? ""}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function ExpenseStatusActions({
  expenseId,
  canApprove,
  categoryLabel,
  amountLabel,
  supplierName,
  submitterName,
  submitterPhone,
  projectUrl,
}: {
  expenseId: string;
  canApprove: boolean;
  categoryLabel: string;
  amountLabel: string;
  supplierName: string | null;
  submitterName: string | null;
  submitterPhone: string | null;
  projectUrl: string;
}) {
  const [isPending, startTransition] = useTransition();

  if (!canApprove) return null;

  const setStatus = (status: "approved" | "rejected" | "needs_information") => {
    startTransition(async () => {
      await updateExpenseStatus({ expenseId, status });
    });
  };

  // Opened synchronously, in direct response to the click — not after the
  // `await` below — so browsers don't treat it as an unrequested popup.
  const requestInfo = () => {
    if (submitterPhone) {
      const digits = submitterPhone.replace(/\D/g, "");
      const greeting = submitterName ? `Bonjour ${submitterName},` : "Bonjour,";
      const details = `${categoryLabel}${supplierName ? ` (${supplierName})` : ""} — ${amountLabel}`;
      const message = `${greeting} une information complémentaire est nécessaire sur la dépense "${details}" sur KeurFlow. Merci de la compléter ou d'ajouter un justificatif : ${projectUrl}`;
      window.open(`https://wa.me/${digits}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    }
    setStatus("needs_information");
  };

  return (
    <div className="mt-2 flex gap-2">
      <button
        type="button"
        disabled={isPending}
        onClick={() => setStatus("approved")}
        className="rounded-full border border-green-300 px-3 py-1 text-xs font-medium text-green-700 disabled:opacity-50 dark:border-green-800 dark:text-green-400"
      >
        Approuver
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={requestInfo}
        className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
      >
        Demander des infos
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => setStatus("rejected")}
        className="rounded-full border border-red-300 px-3 py-1 text-xs font-medium text-red-700 disabled:opacity-50 dark:border-red-800 dark:text-red-400"
      >
        Rejeter
      </button>
    </div>
  );
}
