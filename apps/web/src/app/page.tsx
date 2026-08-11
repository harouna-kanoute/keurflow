export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-24 text-center dark:bg-black">
      <span className="mb-6 text-sm font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
        KeurFlow
      </span>
      <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-black sm:text-5xl dark:text-zinc-50">
        Votre projet en Afrique. Votre argent. Votre visibilité.
      </h1>
      <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
        Suivez vos financements, vos dépenses, vos justificatifs et
        l&apos;avancement de vos travaux depuis n&apos;importe où dans le
        monde.
      </p>
      <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
        <span className="flex h-12 items-center justify-center rounded-full bg-black px-6 text-base font-medium text-white dark:bg-white dark:text-black">
          Commencer gratuitement
        </span>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          7 jours gratuits, sans carte bancaire
        </span>
      </div>
    </div>
  );
}
