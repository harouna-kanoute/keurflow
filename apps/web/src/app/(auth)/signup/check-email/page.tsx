import Link from "next/link";

export default function CheckEmailPage() {
  return (
    <>
      <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-50">
        Vérifiez votre boîte mail
      </h1>
      <p className="mt-3 text-sm text-stone-600 dark:text-stone-400">
        Nous vous avons envoyé un lien de confirmation. Cliquez dessus pour activer votre compte
        KeurFlow.
      </p>
      <Link
        href="/login"
        className="mt-6 inline-block text-sm font-medium text-stone-900 underline dark:text-stone-100"
      >
        Retour à la connexion
      </Link>
    </>
  );
}
