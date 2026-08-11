function SkeletonCard() {
  return (
    <div className="w-full max-w-sm animate-pulse rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="h-3 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="mt-3 h-5 w-40 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="mt-4 h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800" />
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div className="flex flex-1 flex-col items-center gap-6 bg-zinc-50 px-6 py-24 dark:bg-black">
      <div className="flex flex-col items-center gap-2">
        <div className="h-3 w-20 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-6 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}
