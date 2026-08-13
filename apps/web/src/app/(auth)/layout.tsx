import type { Metadata } from "next";
import Link from "next/link";
import { CheckIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Connexion — KeurFlow" };

const HIGHLIGHTS = [
  "Suivez chaque dépense et chaque justificatif en temps réel",
  "Partagez l'avancement avec vos proches sur le terrain",
  "Recevez photos et rapports à chaque étape du chantier",
  "Vos données restent privées, chiffrées et sécurisées",
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <div className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-12 lg:w-1/2 lg:flex-none lg:px-20">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white dark:bg-brand-500">
              K
            </span>
            <span className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              KeurFlow
            </span>
          </Link>
          <div className="mt-10">{children}</div>
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-brand-600 px-16 lg:flex lg:w-1/2 lg:flex-col lg:justify-center dark:bg-brand-700">
        <div
          className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/10 blur-3xl"
          aria-hidden
        />
        <div
          className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-brand-900/30 blur-3xl"
          aria-hidden
        />
        <div className="relative max-w-md">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Votre chantier, sous contrôle où que vous soyez.
          </h2>
          <p className="mt-4 text-base text-brand-100">
            Budget, dépenses, photos et étapes réunis au même endroit — partagés en toute
            confiance avec votre famille sur place.
          </p>
          <ul className="mt-8 flex flex-col gap-3">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-white">
                <CheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-brand-200" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
