import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Connexion — KeurFlow" };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-cream px-6 py-16 dark:bg-stone-950">
      <Link
        href="/"
        className="mb-8 text-sm font-medium tracking-wide text-stone-500 uppercase dark:text-stone-400"
      >
        KeurFlow
      </Link>
      <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-8 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        {children}
      </div>
    </div>
  );
}
