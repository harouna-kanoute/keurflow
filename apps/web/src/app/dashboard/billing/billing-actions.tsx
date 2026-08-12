"use client";

import { useState, useTransition } from "react";
import { createBillingPortalSession, createCheckoutSession } from "./actions";

export function SubscribeButton({
  organizationId,
  planCode = "individual",
  label = "S'abonner",
  variant = "primary",
}: {
  organizationId: string;
  planCode?: string;
  label?: string;
  variant?: "primary" | "secondary";
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await createCheckoutSession(organizationId, planCode);
            if (result?.error) setError(result.error);
          })
        }
        className={
          variant === "primary"
            ? "flex h-10 items-center justify-center rounded-full bg-brand-600 px-5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 dark:bg-brand-500 dark:hover:bg-brand-600"
            : "flex h-10 items-center justify-center rounded-full border border-slate-300 px-5 text-sm font-medium text-slate-900 hover:border-slate-400 disabled:opacity-50 dark:border-slate-700 dark:text-slate-100 dark:hover:border-slate-600"
        }
      >
        {isPending ? "Redirection…" : label}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

export function ManageBillingButton({ organizationId }: { organizationId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await createBillingPortalSession(organizationId);
            if (result?.error) setError(result.error);
          })
        }
        className="flex h-10 items-center justify-center rounded-full border border-slate-300 px-5 text-sm font-medium text-slate-900 disabled:opacity-50 dark:border-slate-700 dark:text-slate-100"
      >
        {isPending ? "Redirection…" : "Gérer mon abonnement"}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
