import type { Metadata } from "next";
import Link from "next/link";
import { ConfirmForm } from "./confirm-form";

export const metadata: Metadata = { title: "Confirmation — KeurFlow" };

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string; next?: string }>;
}) {
  const { token_hash: tokenHash, type, next } = await searchParams;

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-canvas px-6 py-16">
      <Link
        href="/"
        className="mb-8 text-sm font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400"
      >
        KeurFlow
      </Link>
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-left shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {tokenHash && type ? (
          <ConfirmForm tokenHash={tokenHash} type={type} next={next} />
        ) : (
          <>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
              Lien invalide
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Ce lien est incomplet ou déjà utilisé. Demandez-en un nouveau à la personne qui vous
              a invité·e, ou{" "}
              <Link href="/login" className="font-medium text-brand-600 dark:text-brand-400">
                connectez-vous
              </Link>{" "}
              si vous avez déjà un compte.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
