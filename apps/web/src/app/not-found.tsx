import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-zinc-50 px-6 py-24 text-center dark:bg-black">
      <p className="text-sm font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
        KeurFlow
      </p>
      <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Page introuvable</h1>
      <p className="max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
        Cette page n&apos;existe pas ou plus.
      </p>
      <Link
        href="/dashboard"
        className="mt-2 flex h-10 items-center justify-center rounded-full bg-black px-5 text-sm font-medium text-white dark:bg-white dark:text-black"
      >
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
