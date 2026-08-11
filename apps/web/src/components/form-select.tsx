import { forwardRef, type SelectHTMLAttributes } from "react";

interface FormSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
}

export const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(function FormSelect(
  { label, error, id, children, ...props },
  ref,
) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-stone-700 dark:text-stone-300">
        {label}
      </label>
      <select
        id={id}
        ref={ref}
        aria-invalid={error ? true : undefined}
        aria-describedby={error && id ? `${id}-error` : undefined}
        className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-clay-500 focus-visible:ring-2 focus-visible:ring-clay-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50"
        {...props}
      >
        {children}
      </select>
      {error && (
        <p id={id ? `${id}-error` : undefined} className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
});
