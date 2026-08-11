import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-cream px-6 py-24 text-center dark:bg-stone-950">
      <p className="text-sm font-medium tracking-wide text-stone-500 uppercase dark:text-stone-400">
        KeurFlow
      </p>
      <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-50">Page introuvable</h1>
      <p className="max-w-sm text-sm text-stone-500 dark:text-stone-400">
        Cette page n&apos;existe pas ou plus.
      </p>
      <Link
        href="/dashboard"
        className="mt-2 flex h-10 items-center justify-center rounded-full bg-clay-600 px-5 text-sm font-medium text-white hover:bg-clay-700 dark:bg-clay-500 dark:hover:bg-clay-600"
      >
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
