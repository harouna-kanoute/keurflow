"use client";

import { useRef, useState, useTransition } from "react";
import { createExpenseComment } from "./actions";

export type ExpenseCommentView = {
  id: string;
  authorName: string;
  content: string;
  createdAt: string;
};

export function ExpenseComments({
  expenseId,
  comments,
}: {
  expenseId: string;
  comments: ExpenseCommentView[];
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const content = inputRef.current?.value.trim();
    if (!content) return;

    setError(null);
    startTransition(async () => {
      const result = await createExpenseComment({ expenseId, content });
      if (result.error) {
        setError(result.error);
        return;
      }
      if (inputRef.current) inputRef.current.value = "";
    });
  };

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-medium text-stone-500 underline hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
      >
        {comments.length > 0
          ? `${comments.length} commentaire${comments.length > 1 ? "s" : ""}`
          : "Commenter"}
      </button>

      {open && (
        <div className="mt-2 flex flex-col gap-2">
          {comments.map((c) => (
            <div key={c.id} className="rounded-lg bg-stone-50 px-3 py-2 text-xs dark:bg-stone-800">
              <p className="font-medium text-stone-700 dark:text-stone-300">{c.authorName}</p>
              <p className="mt-0.5 text-stone-600 dark:text-stone-400">{c.content}</p>
            </div>
          ))}

          <form onSubmit={onSubmit} className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              placeholder="Écrire un commentaire…"
              maxLength={2000}
              className="flex-1 rounded-lg border border-stone-300 px-3 py-1.5 text-xs text-stone-900 outline-none focus:border-clay-500 focus-visible:ring-2 focus-visible:ring-clay-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50"
            />
            <button
              type="submit"
              disabled={isPending}
              className="shrink-0 rounded-full bg-clay-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-clay-700 disabled:opacity-50 dark:bg-clay-500 dark:hover:bg-clay-600"
            >
              {isPending ? "…" : "Envoyer"}
            </button>
          </form>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
