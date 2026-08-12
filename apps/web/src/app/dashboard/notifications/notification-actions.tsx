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
      className="shrink-0 rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
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
      className="rounded-full border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
    >
      Tout marquer comme lu
    </button>
  );
}
