"use client";

import { useTransition } from "react";
import { markAllNotificationsRead, markNotificationRead } from "../actions";

export function MarkReadButton({ notificationId }: { notificationId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await markNotificationRead(notificationId);
        })
      }
      className="shrink-0 rounded-full border border-stone-300 px-3 py-1 text-xs font-medium text-stone-700 disabled:opacity-50 dark:border-stone-700 dark:text-stone-300"
    >
      Marquer comme lu
    </button>
  );
}

export function MarkAllReadButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await markAllNotificationsRead();
        })
      }
      className="rounded-full border border-stone-300 px-4 py-1.5 text-sm font-medium text-stone-700 disabled:opacity-50 dark:border-stone-700 dark:text-stone-300"
    >
      Tout marquer comme lu
    </button>
  );
}
