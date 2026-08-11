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
      <label htmlFor={id} className="text-sm font-medium text-stone-700 dark:text-stone-300">
        {label}
      </label>
      <input
        id={id}
        ref={ref}
        aria-invalid={error ? true : undefined}
        aria-describedby={error && id ? `${id}-error` : undefined}
        className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 outline-none focus:border-clay-500 focus-visible:ring-2 focus-visible:ring-clay-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50"
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
