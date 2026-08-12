export default function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center bg-canvas">
      <div
        className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900 dark:border-slate-700 dark:border-t-slate-100"
        role="status"
        aria-label="Chargement"
      />
    </div>
  );
}
