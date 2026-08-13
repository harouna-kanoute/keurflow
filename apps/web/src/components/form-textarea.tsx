import { forwardRef, type TextareaHTMLAttributes } from "react";

interface FormTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  function FormTextarea({ label, error, id, rows = 3, ...props }, ref) {
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
        <textarea
          id={id}
          ref={ref}
          rows={rows}
          aria-invalid={error ? true : undefined}
          aria-describedby={error && id ? `${id}-error` : undefined}
          className="resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
          {...props}
        />
        {error && (
          <p id={id ? `${id}-error` : undefined} className="text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  },
);
