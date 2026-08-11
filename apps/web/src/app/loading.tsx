export default function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center bg-cream dark:bg-stone-950">
      <div
        className="h-6 w-6 animate-spin rounded-full border-2 border-stone-300 border-t-stone-900 dark:border-stone-700 dark:border-t-stone-100"
        role="status"
        aria-label="Chargement"
      />
    </div>
  );
}
