"use client";

import { useState, useTransition } from "react";
import { createBillingPortalSession, createCheckoutSession } from "./actions";

export function SubscribeButton({ organizationId }: { organizationId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await createCheckoutSession(organizationId);
            if (result?.error) setError(result.error);
          })
        }
        className="flex h-10 items-center justify-center rounded-full bg-clay-600 px-5 text-sm font-medium text-white hover:bg-clay-700 disabled:opacity-50 dark:bg-clay-500 dark:hover:bg-clay-600"
      >
        {isPending ? "Redirection…" : "S'abonner"}
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
        className="flex h-10 items-center justify-center rounded-full border border-stone-300 px-5 text-sm font-medium text-stone-900 disabled:opacity-50 dark:border-stone-700 dark:text-stone-100"
      >
        {isPending ? "Redirection…" : "Gérer mon abonnement"}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
