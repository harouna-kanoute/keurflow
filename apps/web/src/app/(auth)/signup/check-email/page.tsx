import Link from "next/link";

export default function CheckEmailPage() {
  return (
    <>
      <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
        Vérifiez votre boîte mail
      </h1>
      <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
        Nous vous avons envoyé un lien de confirmation. Cliquez dessus pour activer votre compte
        KeurFlow.
      </p>
      <Link
        href="/login"
        className="mt-6 inline-block text-sm font-medium text-zinc-900 underline dark:text-zinc-100"
      >
        Retour à la connexion
      </Link>
    </>
  );
}
