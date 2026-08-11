import Link from "next/link";
import {
  formatMoney,
  getBudgetConsumptionPercent,
  getRemainingBudget,
  getTotalFunded,
  toMinorUnits,
} from "@keurflow/business";
import { CURRENCIES } from "@keurflow/config";

// Demo data only (§93) — a fictional diaspora project, not a real user's data.
const eur = CURRENCIES.find((c) => c.code === "EUR")!;
const budgetMinor = toMinorUnits(25_000, eur.minorUnit);
const demoFundings = [{ amountMinor: toMinorUnits(18_000, eur.minorUnit) }];
const demoExpenses = [
  { amountMinor: toMinorUnits(9_200, eur.minorUnit), status: "approved" as const },
  { amountMinor: toMinorUnits(1_500, eur.minorUnit), status: "pending" as const },
];

export default function Home() {
  const funded = getTotalFunded(demoFundings);
  const remaining = getRemainingBudget(budgetMinor, demoExpenses);
  const consumedPercent = getBudgetConsumptionPercent(budgetMinor, demoExpenses);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-16 bg-cream px-6 py-24 text-center dark:bg-stone-950">
      <div className="flex flex-col items-center">
        <div className="mb-6 flex items-center gap-4">
          <span className="text-sm font-medium tracking-wide text-stone-500 uppercase dark:text-stone-400">
            KeurFlow
          </span>
          <Link
            href="/login"
            className="text-sm font-medium text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
          >
            Se connecter
          </Link>
        </div>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl dark:text-stone-50">
          Votre projet en Afrique. Votre argent. Votre visibilité.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-stone-600 dark:text-stone-400">
          Suivez vos financements, vos dépenses, vos justificatifs et
          l&apos;avancement de vos travaux depuis n&apos;importe où dans le
          monde.
        </p>
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="flex h-12 items-center justify-center rounded-full bg-clay-600 px-6 text-base font-medium text-white transition-colors hover:bg-clay-700 dark:bg-clay-500 dark:hover:bg-clay-600"
          >
            Commencer gratuitement
          </Link>
          <span className="text-sm text-stone-500 dark:text-stone-400">
            7 jours gratuits, sans carte bancaire
          </span>
        </div>
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-6 text-left shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <p className="text-xs font-medium tracking-wide text-clay-600 uppercase dark:text-clay-400">
          Construction maison familiale — Sénégal
        </p>
        <p className="mt-2 text-2xl font-semibold text-stone-900 dark:text-stone-50">
          {formatMoney(remaining, eur.code, eur.minorUnit)}{" "}
          <span className="text-base font-normal text-stone-500 dark:text-stone-400">
            restants
          </span>
        </p>
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
          <div
            className="h-full rounded-full bg-clay-600 dark:bg-clay-500"
            style={{ width: `${consumedPercent}%` }}
          />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-stone-500 dark:text-stone-400">Budget</dt>
          <dd className="text-right text-stone-900 dark:text-stone-100">
            {formatMoney(budgetMinor, eur.code, eur.minorUnit)}
          </dd>
          <dt className="text-stone-500 dark:text-stone-400">Financé</dt>
          <dd className="text-right text-stone-900 dark:text-stone-100">
            {formatMoney(funded, eur.code, eur.minorUnit)}
          </dd>
          <dt className="text-stone-500 dark:text-stone-400">Consommé</dt>
          <dd className="text-right text-stone-900 dark:text-stone-100">
            {consumedPercent}%
          </dd>
        </dl>
      </div>

      <div className="flex gap-4 text-xs text-stone-400 dark:text-stone-600">
        <Link href="/mentions-legales" className="hover:text-stone-600 dark:hover:text-stone-400">
          Mentions légales
        </Link>
        <Link href="/cgu" className="hover:text-stone-600 dark:hover:text-stone-400">
          CGU
        </Link>
        <Link href="/confidentialite" className="hover:text-stone-600 dark:hover:text-stone-400">
          Confidentialité
        </Link>
      </div>
    </div>
  );
}
