import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-canvas px-6 py-24 text-center">
      <p className="text-sm font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
        KeurFlow
      </p>
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Page introuvable</h1>
      <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
        Cette page n&apos;existe pas ou plus.
      </p>
      <Link
        href="/dashboard"
        className="mt-2 flex h-10 items-center justify-center rounded-full bg-brand-600 px-5 text-sm font-medium text-white hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600"
      >
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
