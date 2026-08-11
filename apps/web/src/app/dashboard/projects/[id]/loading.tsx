function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800 ${className}`} />;
}

export default function ProjectLoading() {
  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-16 dark:bg-black">
      <div className="w-full max-w-lg">
        <SkeletonBlock className="h-4 w-16" />
        <SkeletonBlock className="mt-4 h-8 w-64" />
        <SkeletonBlock className="mt-6 h-40 w-full" />
        <SkeletonBlock className="mt-4 h-32 w-full" />
        <SkeletonBlock className="mt-4 h-32 w-full" />
      </div>
    </div>
  );
}
