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
    <div className="flex flex-1 flex-col items-center justify-center gap-16 bg-zinc-50 px-6 py-24 text-center dark:bg-black">
      <div className="flex flex-col items-center">
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

      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 text-left shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
          Construction maison familiale — Sénégal
        </p>
        <p className="mt-2 text-2xl font-semibold text-black dark:text-zinc-50">
          {formatMoney(remaining, eur.code, eur.minorUnit)}{" "}
          <span className="text-base font-normal text-zinc-500 dark:text-zinc-400">
            restants
          </span>
        </p>
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div
            className="h-full rounded-full bg-black dark:bg-white"
            style={{ width: `${consumedPercent}%` }}
          />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-zinc-500 dark:text-zinc-400">Budget</dt>
          <dd className="text-right text-zinc-900 dark:text-zinc-100">
            {formatMoney(budgetMinor, eur.code, eur.minorUnit)}
          </dd>
          <dt className="text-zinc-500 dark:text-zinc-400">Financé</dt>
          <dd className="text-right text-zinc-900 dark:text-zinc-100">
            {formatMoney(funded, eur.code, eur.minorUnit)}
          </dd>
          <dt className="text-zinc-500 dark:text-zinc-400">Consommé</dt>
          <dd className="text-right text-zinc-900 dark:text-zinc-100">
            {consumedPercent}%
          </dd>
        </dl>
      </div>
    </div>
  );
}
