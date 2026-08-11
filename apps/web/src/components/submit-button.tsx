export function SubmitButton({
  pending,
  children,
}: {
  pending: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 flex h-11 items-center justify-center rounded-full bg-clay-600 text-sm font-medium text-white transition-colors hover:bg-clay-700 disabled:opacity-50 dark:bg-clay-500 dark:hover:bg-clay-600"
    >
      {children}
    </button>
  );
}
