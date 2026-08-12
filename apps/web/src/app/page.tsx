import Image from "next/image";
import Link from "next/link";
import {
  formatMoney,
  getBudgetConsumptionPercent,
  getRemainingBudget,
  getTotalFunded,
  toMinorUnits,
} from "@keurflow/business";
import { CURRENCIES } from "@keurflow/config";
import {
  BudgetIcon,
  ClockIcon,
  FlagIcon,
  GlobeIcon,
  HeroIllustration,
  ReceiptIcon,
  UsersIcon,
} from "@/components/icons";
import { ScrollReveal } from "@/components/scroll-reveal";

// Demo data only (§93) — a fictional diaspora project, not a real user's data.
const eur = CURRENCIES.find((c) => c.code === "EUR")!;
const budgetMinor = toMinorUnits(25_000, eur.minorUnit);
const demoFundings = [{ amountMinor: toMinorUnits(18_000, eur.minorUnit) }];
const demoExpenses = [
  { amountMinor: toMinorUnits(9_200, eur.minorUnit), status: "approved" as const },
  { amountMinor: toMinorUnits(1_500, eur.minorUnit), status: "pending" as const },
];

const NAV_LINKS = [
  { href: "#fonctionnalites", label: "Fonctionnalités" },
  { href: "#comment-ca-marche", label: "Comment ça marche" },
  { href: "#tarifs", label: "Tarifs" },
];

const FEATURES = [
  {
    title: "Suivi budgétaire en temps réel",
    description: "Financements, dépenses et solde restant, toujours à jour, où que vous soyez.",
    icon: BudgetIcon,
  },
  {
    title: "Une preuve pour chaque dépense",
    description: "Reçus, photos et documents joints à chaque ligne, consultables et vérifiables à distance.",
    icon: ReceiptIcon,
  },
  {
    title: "Étapes de chantier suivies",
    description: "L'avancement des travaux jalon par jalon, du terrassement à la livraison.",
    icon: FlagIcon,
  },
  {
    title: "Multi-pays, multi-devise",
    description: "Chaque projet garde son pays et sa devise locale — pas de conversion approximative.",
    icon: GlobeIcon,
  },
  {
    title: "Rôles et permissions",
    description: "Famille, gérant sur place, agence : chacun voit et fait exactement ce qu'il doit.",
    icon: UsersIcon,
  },
  {
    title: "Journal d'activité",
    description: "Chaque action est horodatée et tracée, pour une confiance totale entre financeur et exécutant.",
    icon: ClockIcon,
  },
] as const;

const STEPS = [
  {
    title: "Créez votre projet",
    description: "Nom, pays, devise, budget prévisionnel. Deux minutes suffisent.",
  },
  {
    title: "Invitez votre équipe",
    description: "Un gérant sur place, des proches financeurs, un vérificateur de confiance.",
  },
  {
    title: "Suivez et validez à distance",
    description: "Dépenses, financements et photos de chantier, en temps réel, depuis n'importe où.",
  },
] as const;

// Free-license photos (Unsplash) — real construction-site imagery, per user
// request, layered onto a grid so no single shot has to "represent Africa".
const GALLERY_PHOTOS = [
  {
    id: "wdFwHVkEwy8",
    url: "https://images.unsplash.com/photo-1668609268461-4f6a15269ff1?q=80&w=800&auto=format&fit=crop",
    alt: "Ouvrier portant des briques sur un chantier",
  },
  {
    id: "04rZ7R1fKhY",
    url: "https://images.unsplash.com/photo-1563166423-482a8c14b2d6?q=80&w=800&auto=format&fit=crop",
    alt: "Bâtiment en cours de construction, gros œuvre",
  },
  {
    id: "Dl8rvbAcALM",
    url: "https://images.unsplash.com/photo-1621355254227-14b1001a91c9?q=80&w=800&auto=format&fit=crop",
    alt: "Engin de chantier sur un terrain en construction",
  },
  {
    id: "d4j5hns6sj8",
    url: "https://images.unsplash.com/photo-1740825961434-e9287638592b?q=80&w=800&auto=format&fit=crop",
    alt: "Deux ouvriers du bâtiment faisant une pause sur le chantier",
  },
  {
    id: "Z0DNWoUP65k",
    url: "https://images.unsplash.com/photo-1635249578213-68b0aa67fdf7?q=80&w=800&auto=format&fit=crop",
    alt: "Ouvrier avec un casque de chantier au travail",
  },
  {
    id: "fIw91B4ZkcE",
    url: "https://images.unsplash.com/photo-1630254428244-ac29b798067f?q=80&w=800&auto=format&fit=crop",
    alt: "Vue aérienne d'un bâtiment en construction",
  },
] as const;

const FAQ = [
  {
    question: "Puis-je annuler à tout moment ?",
    answer: "Oui, sans engagement, directement depuis votre espace abonnement.",
  },
  {
    question: "Mes données sont-elles en sécurité ?",
    answer:
      "Oui. Chaque organisation est strictement isolée des autres, vos documents restent privés et vos données ne sont jamais revendues.",
  },
  {
    question: "Dans quels pays KeurFlow fonctionne-t-il ?",
    answer: "Partout : chaque projet garde son propre pays et sa propre devise.",
  },
  {
    question: "Ai-je besoin d'une carte bancaire pour l'essai ?",
    answer: "Non, les 7 jours d'essai gratuit ne demandent aucune carte bancaire.",
  },
] as const;

export default function Home() {
  const funded = getTotalFunded(demoFundings);
  const remaining = getRemainingBudget(budgetMinor, demoExpenses);
  const consumedPercent = getBudgetConsumptionPercent(budgetMinor, demoExpenses);
  const individualPriceMinor = toMinorUnits(9.9, eur.minorUnit);

  return (
    <div className="flex flex-1 flex-col bg-canvas">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-canvas/90 backdrop-blur-sm dark:border-slate-800">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <Link
            href="/"
            className="text-sm font-medium tracking-wide text-slate-900 uppercase dark:text-slate-50"
          >
            KeurFlow
          </Link>
          <nav className="hidden items-center gap-8 sm:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-5">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            >
              Se connecter
            </Link>
            <Link
              href="/signup"
              className="flex h-9 items-center justify-center rounded-full bg-brand-600 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600"
            >
              Commencer
            </Link>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        <section className="mx-auto grid w-full max-w-6xl items-center gap-16 px-6 py-24 lg:grid-cols-2">
          <div>
            <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl dark:text-slate-50">
              Votre projet en Afrique. Votre argent. Votre visibilité.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-slate-600 dark:text-slate-400">
              Suivez vos financements, vos dépenses, vos justificatifs et
              l&apos;avancement de vos travaux depuis n&apos;importe où dans le
              monde.
            </p>
            <div className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <Link
                href="/signup"
                className="flex h-12 items-center justify-center rounded-full bg-brand-600 px-6 text-base font-medium text-white transition-colors hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600"
              >
                Commencer gratuitement
              </Link>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                7 jours gratuits, sans carte bancaire
              </span>
            </div>
          </div>

          <div className="flex w-full max-w-sm flex-col gap-6 justify-self-center lg:justify-self-end">
            <HeroIllustration className="hidden h-auto w-full sm:block" />

            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-medium tracking-wide text-brand-600 uppercase dark:text-brand-400">
                Construction maison familiale — Sénégal
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">
                {formatMoney(remaining, eur.code, eur.minorUnit)}{" "}
                <span className="text-base font-normal text-slate-500 dark:text-slate-400">
                  restants
                </span>
              </p>
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-brand-600 dark:bg-brand-500"
                  style={{ width: `${consumedPercent}%` }}
                />
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
                <dt className="text-slate-500 dark:text-slate-400">Budget</dt>
                <dd className="text-right text-slate-900 dark:text-slate-100">
                  {formatMoney(budgetMinor, eur.code, eur.minorUnit)}
                </dd>
                <dt className="text-slate-500 dark:text-slate-400">Financé</dt>
                <dd className="text-right text-slate-900 dark:text-slate-100">
                  {formatMoney(funded, eur.code, eur.minorUnit)}
                </dd>
                <dt className="text-slate-500 dark:text-slate-400">Consommé</dt>
                <dd className="text-right text-slate-900 dark:text-slate-100">
                  {consumedPercent}%
                </dd>
              </dl>
            </div>
          </div>
        </section>

        <section id="fonctionnalites" className="border-t border-slate-200 px-6 py-24 dark:border-slate-800">
          <ScrollReveal className="mx-auto w-full max-w-6xl">
            <div className="max-w-xl">
              <p className="text-sm font-medium tracking-wide text-brand-600 uppercase dark:text-brand-400">
                Fonctionnalités
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                Tout ce qu&apos;il faut pour financer à distance, en confiance
              </h2>
            </div>
            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <div key={feature.title}>
                  <feature.icon className="h-7 w-7 text-brand-600 dark:text-brand-500" />
                  <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-slate-50">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </section>

        <section
          id="comment-ca-marche"
          className="border-t border-slate-200 bg-white px-6 py-24 dark:border-slate-800 dark:bg-slate-900"
        >
          <ScrollReveal className="mx-auto w-full max-w-6xl">
            <div className="max-w-xl">
              <p className="text-sm font-medium tracking-wide text-brand-600 uppercase dark:text-brand-400">
                Comment ça marche
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                Opérationnel en trois étapes
              </h2>
            </div>
            <ol className="mt-12 grid gap-10 sm:grid-cols-3">
              {STEPS.map((step, index) => (
                <li key={step.title}>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700 dark:bg-brand-900 dark:text-brand-300">
                    {index + 1}
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-slate-50">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                    {step.description}
                  </p>
                </li>
              ))}
            </ol>
          </ScrollReveal>
        </section>

        <section
          id="galerie"
          className="border-t border-slate-200 px-6 py-24 dark:border-slate-800"
        >
          <ScrollReveal className="mx-auto w-full max-w-6xl">
            <div className="max-w-xl">
              <p className="text-sm font-medium tracking-wide text-brand-600 uppercase dark:text-brand-400">
                Sur le terrain
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                Le chantier, vu depuis chez vous
              </h2>
            </div>
            <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {GALLERY_PHOTOS.map((photo, index) => (
                <ScrollReveal
                  key={photo.id}
                  delayMs={index * 80}
                  className={index % 3 === 1 ? "sm:mt-8" : ""}
                >
                  <div className="relative aspect-4/5 overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800">
                    <Image
                      src={photo.url}
                      alt={photo.alt}
                      fill
                      sizes="(min-width: 640px) 33vw, 50vw"
                      className="object-cover"
                    />
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </ScrollReveal>
        </section>

        <section id="tarifs" className="border-t border-slate-200 px-6 py-24 dark:border-slate-800">
          <ScrollReveal className="mx-auto w-full max-w-6xl">
            <div className="max-w-xl">
              <p className="text-sm font-medium tracking-wide text-brand-600 uppercase dark:text-brand-400">
                Tarifs
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                Un prix simple, sans surprise
              </h2>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <p className="text-sm font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
                  Particulier
                </p>
                <p className="mt-3 text-4xl font-semibold text-slate-900 dark:text-slate-50">
                  {formatMoney(individualPriceMinor, eur.code, eur.minorUnit)}
                  <span className="text-base font-normal text-slate-500 dark:text-slate-400"> / mois</span>
                </p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  7 jours d&apos;essai gratuit, sans carte bancaire.
                </p>
                <ul className="mt-6 flex flex-col gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <li>1 projet actif</li>
                  <li>Application mobile</li>
                  <li>Collaborateurs illimités</li>
                  <li>Rapports d&apos;avancement</li>
                </ul>
                <Link
                  href="/signup"
                  className="mt-8 flex h-11 items-center justify-center rounded-full bg-brand-600 text-sm font-medium text-white transition-colors hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600"
                >
                  Commencer gratuitement
                </Link>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <p className="text-sm font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
                  Agence
                </p>
                <p className="mt-3 text-4xl font-semibold text-slate-900 dark:text-slate-50">Sur devis</p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  14 jours d&apos;essai gratuit. Tarif adapté à votre volume de chantiers.
                </p>
                <ul className="mt-6 flex flex-col gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <li>Plusieurs chantiers</li>
                  <li>Tableau de bord agence</li>
                  <li>Gestion multi-clients</li>
                  <li>Rapports d&apos;avancement</li>
                </ul>
                <Link
                  href="/signup"
                  className="mt-8 flex h-11 items-center justify-center rounded-full border border-slate-300 text-sm font-medium text-slate-900 transition-colors hover:border-slate-400 dark:border-slate-700 dark:text-slate-100 dark:hover:border-slate-600"
                >
                  Essayer gratuitement
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </section>

        <section className="border-t border-slate-200 bg-white px-6 py-24 dark:border-slate-800 dark:bg-slate-900">
          <ScrollReveal className="mx-auto w-full max-w-3xl">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              Questions fréquentes
            </h2>
            <div className="mt-10 flex flex-col divide-y divide-slate-200 dark:divide-slate-800">
              {FAQ.map((item) => (
                <details key={item.question} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between text-base font-medium text-slate-900 dark:text-slate-50">
                    {item.question}
                    <span className="ml-4 shrink-0 text-slate-400 group-open:rotate-45 dark:text-slate-500">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">{item.answer}</p>
                </details>
              ))}
            </div>
          </ScrollReveal>
        </section>

        <section className="border-t border-slate-200 bg-brand-600 px-6 py-20 dark:border-slate-800 dark:bg-brand-700">
          <ScrollReveal className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 text-center">
            <h2 className="max-w-xl text-3xl font-semibold tracking-tight text-white">
              Prêt à suivre votre projet, où que vous soyez ?
            </h2>
            <div className="flex flex-col items-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="flex h-12 items-center justify-center rounded-full bg-white px-6 text-base font-medium text-brand-700 transition-colors hover:bg-brand-50"
              >
                Commencer gratuitement
              </Link>
              <Link
                href="/login"
                className="flex h-12 items-center justify-center rounded-full border border-white/40 px-6 text-base font-medium text-white transition-colors hover:border-white"
              >
                Se connecter
              </Link>
            </div>
          </ScrollReveal>
        </section>
      </main>

      <footer className="border-t border-slate-200 px-6 py-12 dark:border-slate-800">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium tracking-wide text-slate-900 uppercase dark:text-slate-50">
              KeurFlow
            </p>
            <p className="mt-2 max-w-xs text-sm text-slate-500 dark:text-slate-400">
              Suivez vos projets de construction en Afrique, depuis n&apos;importe où dans le monde.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-12 gap-y-6">
            <div className="flex flex-col gap-2 text-sm">
              <p className="font-medium text-slate-900 dark:text-slate-50">Produit</p>
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                >
                  {link.label}
                </a>
              ))}
              <Link
                href="/login"
                className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              >
                Se connecter
              </Link>
            </div>
            <div className="flex flex-col gap-2 text-sm">
              <p className="font-medium text-slate-900 dark:text-slate-50">Légal</p>
              <Link
                href="/mentions-legales"
                className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              >
                Mentions légales
              </Link>
              <Link
                href="/cgu"
                className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              >
                CGU
              </Link>
              <Link
                href="/confidentialite"
                className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              >
                Confidentialité
              </Link>
            </div>
          </div>
        </div>
        <p className="mx-auto mt-10 w-full max-w-6xl text-xs text-slate-400 dark:text-slate-600">
          © {new Date().getFullYear()} KeurFlow. Tous droits réservés.
        </p>
      </footer>
    </div>
  );
}
