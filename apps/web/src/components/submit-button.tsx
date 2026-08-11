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
      className="mt-2 flex h-11 items-center justify-center rounded-full bg-black text-sm font-medium text-white transition-opacity disabled:opacity-50 dark:bg-white dark:text-black"
    >
      {children}
    </button>
  );
}
