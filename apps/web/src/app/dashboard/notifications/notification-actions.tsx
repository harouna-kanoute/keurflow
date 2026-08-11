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
      className="shrink-0 rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300"
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
      className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium text-zinc-700 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300"
    >
      Tout marquer comme lu
    </button>
  );
}
