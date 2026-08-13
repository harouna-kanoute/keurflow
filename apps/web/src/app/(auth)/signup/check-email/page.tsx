import Link from "next/link";

export default function CheckEmailPage() {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
        Vérifiez votre boîte mail
      </h1>
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
        Nous vous avons envoyé un lien de confirmation. Cliquez dessus pour activer votre compte
        KeurFlow.
      </p>
      <Link
        href="/login"
        className="mt-6 inline-block text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
      >
        ← Retour à la connexion
      </Link>
    </>
  );
}
