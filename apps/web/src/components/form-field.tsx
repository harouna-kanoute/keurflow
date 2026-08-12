import { forwardRef, type InputHTMLAttributes } from "react";

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(function FormField(
  { label, error, id, ...props },
  ref,
) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>
      <input
        id={id}
        ref={ref}
        aria-invalid={error ? true : undefined}
        aria-describedby={error && id ? `${id}-error` : undefined}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
        {...props}
      />
      {error && (
        <p id={id ? `${id}-error` : undefined} className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
});
