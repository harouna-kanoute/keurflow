import Image from "next/image";
import Link from "next/link";
import {
  formatMoney,
  getBudgetConsumptionPercent,
  getRemainingBudget,
  getTotalFunded,
  toMinorUnits,
} from "@keurflow/business";
import { COUNTRIES, CURRENCIES } from "@keurflow/config";
import {
  BriefcaseIcon,
  BudgetIcon,
  CheckIcon,
  ClockIcon,
  EditIcon,
  FlagIcon,
  GlobeIcon,
  HomeIcon,
  ReceiptIcon,
  ShieldIcon,
  UsersIcon,
  WarningIcon,
} from "@/components/icons";
import { ScrollReveal } from "@/components/scroll-reveal";
import { TrackedLink } from "@/components/tracked-link";
import { AnalyticsPageView } from "@/components/analytics-page-view";
import { KeurFlowMark } from "@/components/keurflow-mark";
import { createClient } from "@/lib/supabase/server";

// Demo data only (§93) — a fictional diaspora project, not a real user's data.
const eur = CURRENCIES.find((c) => c.code === "EUR")!;
const budgetMinor = toMinorUnits(25_000, eur.minorUnit);
const demoFundings = [{ amountMinor: toMinorUnits(18_000, eur.minorUnit) }];
const demoExpenses = [
  { amountMinor: toMinorUnits(9_200, eur.minorUnit), status: "approved" as const },
  { amountMinor: toMinorUnits(1_500, eur.minorUnit), status: "pending" as const },
];

// The one country list this page will ever show — pulled from the same
// catalog the signup form's country picker uses, so the "où" claims here
// can never drift ahead of what actually works.
const ACTIVE_COUNTRIES = COUNTRIES.filter((c) => c.active);

const NAV_LINKS = [
  { href: "#fonctionnalites", label: "Fonctionnalités" },
  { href: "#comment-ca-marche", label: "Comment ça marche" },
  { href: "#securite", label: "Sécurité" },
  { href: "#tarifs", label: "Tarifs" },
];

const PAIN_POINTS = [
  "Des dépenses éparpillées entre WhatsApp, appels et notes papier",
  "Des photos de chantier perdues dans des conversations sans fin",
  "Aucune vue claire sur ce qu'il reste vraiment à financer",
  "Des reçus et documents qui s'égarent avant même d'arriver jusqu'à vous",
  "Un avancement des travaux difficile à vérifier à distance",
  "Des informations réparties entre plusieurs personnes, sans vue d'ensemble",
] as const;

const DIASPORA_ROUTES = [
  { from: "Paris 🇫🇷", to: "Abidjan 🇨🇮" },
  { from: "Bruxelles 🇧🇪", to: "Bamako 🇲🇱" },
  { from: "Montréal 🇨🇦", to: "Dakar 🇸🇳" },
] as const;

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
    title: "Étapes de projet suivies",
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

const AUDIENCE_CARDS = [
  {
    title: "Vous construisez",
    description: "Votre maison dans votre pays d'origine.",
    icon: HomeIcon,
  },
  {
    title: "Vous rénovez",
    description: "Vous souhaitez suivre des travaux à distance.",
    icon: EditIcon,
  },
  {
    title: "Vous investissez",
    description: "Vous gérez un investissement immobilier depuis l'étranger.",
    icon: BudgetIcon,
  },
  {
    title: "Vous gérez un projet familial",
    description: "Vous financez un projet avec des proches sur place.",
    icon: UsersIcon,
  },
  {
    title: "Vous développez un projet professionnel",
    description: "Commerce, local, entreprise ou tout autre projet.",
    icon: BriefcaseIcon,
  },
] as const;

const SECURITY_POINTS = [
  {
    title: "Isolation stricte entre organisations",
    description: "Chaque espace de travail est cloisonné — personne d'autre ne voit vos projets, jamais.",
  },
  {
    title: "Fichiers privés, jamais publics",
    description: "Reçus, photos et documents sont servis via des liens signés et temporaires, propres à chaque consultation.",
  },
  {
    title: "Permissions par rôle",
    description: "Propriétaire, responsable, collaborateur, lecture seule — chacun n'accède qu'à ce qui le concerne.",
  },
  {
    title: "Journal d'activité complet",
    description: "Chaque création, modification et validation est horodatée et attribuée, consultable à tout moment.",
  },
] as const;

// Free-license photos (Unsplash) — real construction-site imagery, per user
// request, layered onto a grid so no single shot has to "represent Africa".
const HERO_PHOTO = {
  id: "wdFwHVkEwy8",
  url: "https://images.unsplash.com/photo-1668609268461-4f6a15269ff1?q=80&w=800&auto=format&fit=crop",
  alt: "Ouvrier portant des briques sur un chantier",
};

const GALLERY_PHOTOS = [
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
    question: "KeurFlow fonctionne-t-il dans mon pays ?",
    answer:
      "KeurFlow est pensé pour la diaspora africaine dans son ensemble, pas pour un seul pays. Il prend en charge le Sénégal, la Côte d'Ivoire, le Mali, la Guinée, la Mauritanie, le Burkina Faso, le Niger, le Bénin, le Togo, le Cameroun, le Gabon, le Congo et la RDC, avec de nouveaux pays ajoutés régulièrement.",
  },
  {
    question: "Puis-je gérer un projet situé dans un autre pays africain ?",
    answer:
      "Oui. Chaque projet garde son propre pays et sa propre devise locale — vous pouvez suivre plusieurs projets dans plusieurs pays depuis le même compte.",
  },
  {
    question: "Puis-je utiliser KeurFlow depuis n'importe quel pays d'accueil ?",
    answer:
      "Oui, KeurFlow fonctionne depuis n'importe où dans le monde : il vous suffit d'une connexion internet, où que vous résidiez.",
  },
  {
    question: "Puis-je inviter ma famille ou mes collaborateurs ?",
    answer:
      "Oui, vous pouvez inviter un gérant sur place, des proches financeurs ou un vérificateur de confiance, chacun avec le niveau d'accès que vous choisissez.",
  },
  {
    question: "Puis-je suivre plusieurs projets ?",
    answer:
      "Le plan Particulier permet de suivre un projet actif. Pour en suivre plusieurs simultanément, l'option projets illimités ou le plan Agence immobilière sont faits pour ça.",
  },
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
    question: "Ai-je besoin d'une carte bancaire pour l'essai ?",
    answer: "Non, les 7 jours d'essai gratuit ne demandent aucune carte bancaire.",
  },
] as const;

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const funded = getTotalFunded(demoFundings);
  const remaining = getRemainingBudget(budgetMinor, demoExpenses);
  const consumedPercent = getBudgetConsumptionPercent(budgetMinor, demoExpenses);
  const individualPriceMinor = toMinorUnits(9.9, eur.minorUnit);
  const agencyPriceMinor = toMinorUnits(19.9, eur.minorUnit);

  const softwareApplicationJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "KeurFlow",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, iOS, Android",
    description:
      "KeurFlow aide la diaspora africaine à suivre à distance ses projets de construction et d'investissement en Afrique : budget, dépenses, documents, photos et avancement, centralisés en un seul espace.",
    offers: [
      {
        "@type": "Offer",
        name: "Particulier",
        price: (individualPriceMinor / 10 ** eur.minorUnit).toFixed(2),
        priceCurrency: eur.code,
        priceValidUntil: undefined,
      },
      {
        "@type": "Offer",
        name: "Agence immobilière",
        price: (agencyPriceMinor / 10 ** eur.minorUnit).toFixed(2),
        priceCurrency: eur.code,
      },
    ],
  };

  return (
    <div className="flex flex-1 flex-col bg-canvas">
      <AnalyticsPageView event="landing_view" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationJsonLd) }}
      />
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-canvas/90 backdrop-blur-sm dark:border-slate-800">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" aria-label="KeurFlow" className="shrink-0">
            <KeurFlowMark className="h-8 w-8 shrink-0" />
          </Link>
          <nav className="hidden items-center gap-8 lg:flex">
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
          <div className="flex shrink-0 items-center gap-3 sm:gap-5">
            {user ? (
              <Link
                href="/dashboard"
                className="flex h-9 items-center justify-center rounded-full bg-brand-600 px-4 text-sm font-medium whitespace-nowrap text-white transition-colors hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium whitespace-nowrap text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                >
                  Se connecter
                </Link>
                <TrackedLink
                  href="/signup"
                  event="hero_cta_click"
                  eventParams={{ location: "header" }}
                  className="flex h-9 items-center justify-center rounded-full bg-brand-600 px-3 text-sm font-medium whitespace-nowrap text-white transition-colors hover:bg-brand-700 sm:px-4 dark:bg-brand-500 dark:hover:bg-brand-600"
                >
                  <span className="sm:hidden">S&apos;inscrire</span>
                  <span className="hidden sm:inline">Commencer gratuitement</span>
                </TrackedLink>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        <section className="mx-auto grid w-full max-w-6xl items-center gap-16 px-6 pt-20 pb-32 lg:grid-cols-2 lg:pb-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1.5 text-xs font-medium text-brand-700 dark:border-brand-900 dark:bg-brand-900/40 dark:text-brand-300">
              <GlobeIcon className="h-3.5 w-3.5" />
              Pensé pour la diaspora africaine
            </span>
            <h1 className="mt-6 max-w-xl text-5xl font-bold tracking-tight text-slate-900 sm:text-6xl dark:text-slate-50">
              Votre projet en Afrique.
              <br />
              Votre visibilité, où que vous soyez.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-slate-600 dark:text-slate-400">
              Suivez vos projets, centralisez vos dépenses, vos documents, vos
              photos et l&apos;avancement des travaux depuis un seul espace —
              où que vous viviez en Europe, en Amérique ou ailleurs.
            </p>
            <div className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <TrackedLink
                href="/signup"
                event="hero_cta_click"
                eventParams={{ location: "hero" }}
                className="flex h-12 shrink-0 items-center justify-center rounded-full bg-brand-600 px-6 text-base font-medium whitespace-nowrap text-white transition-colors hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600"
              >
                Commencer gratuitement
              </TrackedLink>
              <a
                href="#comment-ca-marche"
                className="flex h-12 shrink-0 items-center justify-center rounded-full border border-slate-300 px-6 text-base font-medium whitespace-nowrap text-slate-900 transition-colors hover:border-slate-400 dark:border-slate-700 dark:text-slate-100 dark:hover:border-slate-600"
              >
                Découvrir comment ça marche
              </a>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                <CheckIcon className="h-4 w-4 text-brand-600 dark:text-brand-500" />
                7 jours gratuits · Sans engagement
              </span>
              <span className="flex items-center gap-1.5">
                <CheckIcon className="h-4 w-4 text-brand-600 dark:text-brand-500" />
                Données privées et sécurisées
              </span>
              <span className="flex items-center gap-1.5">
                <CheckIcon className="h-4 w-4 text-brand-600 dark:text-brand-500" />
                En français
              </span>
            </div>
          </div>

          <div className="relative mb-10 w-full max-w-sm justify-self-center lg:mb-0 lg:justify-self-end">
            <div className="relative aspect-4/5 w-full overflow-hidden rounded-3xl shadow-xl">
              <Image
                src={HERO_PHOTO.url}
                alt={HERO_PHOTO.alt}
                fill
                priority
                sizes="(min-width: 1024px) 24rem, 90vw"
                className="object-cover"
              />
            </div>

            <div className="absolute -bottom-10 left-1/2 w-[calc(100%-2rem)] -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-lg dark:border-slate-800 dark:bg-slate-900 sm:left-1/2 sm:w-72">
              <p className="text-xs font-medium tracking-wide text-brand-600 uppercase dark:text-brand-400">
                Construction maison familiale
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

        <section className="border-t border-slate-200 bg-white px-6 py-24 dark:border-slate-800 dark:bg-slate-900">
          <ScrollReveal className="mx-auto w-full max-w-6xl">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-medium tracking-wide text-brand-600 uppercase dark:text-brand-400">
                Le constat
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                Vous êtes loin. Votre projet ne devrait pas vous échapper.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-400">
                KeurFlow vous permet de garder une vision claire de ce qui se
                passe sur le terrain, même à des milliers de kilomètres. À
                distance, gérer un projet peut vite devenir compliqué :
              </p>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {PAIN_POINTS.map((point) => (
                <div
                  key={point}
                  className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-canvas p-5 dark:border-slate-800 dark:bg-slate-950"
                >
                  <WarningIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-500 dark:text-amber-400" />
                  <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">{point}</p>
                </div>
              ))}
            </div>
            <p className="mt-10 text-center text-base font-medium text-slate-900 dark:text-slate-50">
              KeurFlow rassemble tout au même endroit.
            </p>
          </ScrollReveal>
        </section>

        <section className="border-t border-slate-200 px-6 py-24 dark:border-slate-800">
          <ScrollReveal className="mx-auto w-full max-w-6xl">
            <div className="mx-auto max-w-xl text-center">
              <p className="text-sm font-medium tracking-wide text-brand-600 uppercase dark:text-brand-400">
                Votre histoire
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                Vous êtes à Paris. Votre projet est à Abidjan.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-400">
                Vous vivez à l&apos;étranger. Votre projet, votre famille et
                vos prestataires sont en Afrique. KeurFlow fonctionne quel que
                soit le trajet.
              </p>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-3">
              {DIASPORA_ROUTES.map((route) => (
                <div
                  key={`${route.from}-${route.to}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
                      Vous êtes à
                    </p>
                    <p className="mt-1 truncate text-base font-semibold text-slate-900 dark:text-slate-50">
                      {route.from}
                    </p>
                  </div>
                  <span aria-hidden className="shrink-0 text-lg text-brand-600 dark:text-brand-400">
                    →
                  </span>
                  <div className="min-w-0 text-right">
                    <p className="text-xs font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
                      Votre projet est à
                    </p>
                    <p className="mt-1 truncate text-base font-semibold text-slate-900 dark:text-slate-50">
                      {route.to}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mx-auto mt-10 max-w-2xl text-center text-base leading-7 text-slate-600 dark:text-slate-400">
              Au lieu de chercher des informations dans plusieurs
              conversations, vous retrouvez le budget, les dépenses, les
              photos, les documents et l&apos;avancement — dans KeurFlow.
            </p>
          </ScrollReveal>
        </section>

        <section id="fonctionnalites" className="border-t border-slate-200 bg-white px-6 py-24 dark:border-slate-800 dark:bg-slate-900">
          <ScrollReveal className="mx-auto w-full max-w-6xl">
            <div className="max-w-xl">
              <p className="text-sm font-medium tracking-wide text-brand-600 uppercase dark:text-brand-400">
                Fonctionnalités
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                Tout ce qu&apos;il faut pour financer à distance, en confiance
              </h2>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-slate-200 p-6 transition-colors hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-900/40">
                    <feature.icon className="h-5.5 w-5.5 text-brand-600 dark:text-brand-400" />
                  </span>
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
          className="border-t border-slate-200 px-6 py-24 dark:border-slate-800"
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
            <ol className="relative mt-12 grid gap-10 sm:grid-cols-3">
              <div
                aria-hidden
                className="absolute top-5 right-0 left-0 hidden h-px bg-slate-200 sm:block dark:bg-slate-800"
              />
              {STEPS.map((step, index) => (
                <li key={step.title} className="relative">
                  <span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white dark:bg-brand-500">
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

        <section className="border-t border-slate-200 bg-white px-6 py-24 dark:border-slate-800 dark:bg-slate-900">
          <ScrollReveal className="mx-auto w-full max-w-6xl">
            <div className="mx-auto max-w-xl text-center">
              <p className="text-sm font-medium tracking-wide text-brand-600 uppercase dark:text-brand-400">
                Pour qui
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                KeurFlow est fait pour vous si...
              </h2>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {AUDIENCE_CARDS.map((card) => (
                <div
                  key={card.title}
                  className="rounded-2xl border border-slate-200 p-6 dark:border-slate-800"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-900/40">
                    <card.icon className="h-5.5 w-5.5 text-brand-600 dark:text-brand-400" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-slate-50">
                    {card.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                    {card.description}
                  </p>
                </div>
              ))}
            </div>
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

        <section className="border-t border-slate-200 bg-white px-6 py-24 dark:border-slate-800 dark:bg-slate-900">
          <ScrollReveal className="mx-auto w-full max-w-6xl">
            <div className="mx-auto max-w-xl text-center">
              <p className="text-sm font-medium tracking-wide text-brand-600 uppercase dark:text-brand-400">
                Vision internationale
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                Un seul espace. Plusieurs pays. Une même simplicité.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-400">
                KeurFlow est pensé pour accompagner les projets de la
                diaspora africaine, où qu&apos;ils se trouvent sur le
                continent.
              </p>
            </div>
            <div className="mx-auto mt-10 flex max-w-3xl flex-wrap justify-center gap-2.5">
              {ACTIVE_COUNTRIES.map((country) => (
                <span
                  key={country.code}
                  className="rounded-full border border-slate-200 bg-canvas px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                >
                  {country.name}
                </span>
              ))}
              <span className="rounded-full border border-dashed border-slate-300 px-4 py-2 text-sm font-medium text-slate-400 dark:border-slate-700 dark:text-slate-500">
                Et bientôt plus encore
              </span>
            </div>
          </ScrollReveal>
        </section>

        <section
          id="securite"
          className="border-t border-slate-200 px-6 py-24 dark:border-slate-800"
        >
          <ScrollReveal className="mx-auto grid w-full max-w-6xl items-center gap-16 lg:grid-cols-2">
            <div>
              <p className="text-sm font-medium tracking-wide text-brand-600 uppercase dark:text-brand-400">
                Sécurité
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                Vos informations méritent d&apos;être protégées
              </h2>
              <p className="mt-4 max-w-lg text-base leading-7 text-slate-600 dark:text-slate-400">
                Chaque projet est privé. Seules les personnes que vous invitez
                peuvent y accéder, selon les permissions que vous définissez.
              </p>
              <ul className="mt-8 flex flex-col gap-6">
                {SECURITY_POINTS.map((point) => (
                  <li key={point.title} className="flex items-start gap-3">
                    <CheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-brand-600 dark:text-brand-500" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                        {point.title}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                        {point.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex aspect-square w-full items-center justify-center rounded-3xl bg-brand-50 dark:bg-brand-900/20">
              <ShieldIcon className="h-32 w-32 text-brand-600 dark:text-brand-400" />
            </div>
          </ScrollReveal>
        </section>

        <section id="tarifs" className="border-t border-slate-200 bg-white px-6 py-24 dark:border-slate-800 dark:bg-slate-900">
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
              <div className="relative rounded-2xl border-2 border-brand-600 bg-canvas p-8 dark:border-brand-500 dark:bg-slate-950">
                <span className="absolute -top-3 left-8 rounded-full bg-brand-600 px-3 py-1 text-xs font-medium text-white dark:bg-brand-500">
                  Pour commencer
                </span>
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
                <ul className="mt-6 flex flex-col gap-2.5 text-sm text-slate-700 dark:text-slate-300">
                  {["1 projet actif", "Application mobile", "Collaborateurs illimités", "Rapports d'avancement"].map(
                    (item) => (
                      <li key={item} className="flex items-center gap-2.5">
                        <CheckIcon className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-500" />
                        {item}
                      </li>
                    ),
                  )}
                </ul>
                <TrackedLink
                  href="/signup"
                  event="pricing_cta_click"
                  eventParams={{ plan: "individual" }}
                  className="mt-8 flex h-11 items-center justify-center rounded-full bg-brand-600 text-sm font-medium text-white transition-colors hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600"
                >
                  Commencer gratuitement
                </TrackedLink>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-canvas p-8 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-sm font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
                  Agence immobilière
                </p>
                <p className="mt-3 text-4xl font-semibold text-slate-900 dark:text-slate-50">
                  {formatMoney(agencyPriceMinor, eur.code, eur.minorUnit)}
                  <span className="text-base font-normal text-slate-500 dark:text-slate-400"> / mois</span>
                </p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  14 jours d&apos;essai gratuit, sans carte bancaire.
                </p>
                <ul className="mt-6 flex flex-col gap-2.5 text-sm text-slate-700 dark:text-slate-300">
                  {["Plusieurs chantiers", "Tableau de bord agence", "Gestion multi-clients", "Rapports d'avancement"].map(
                    (item) => (
                      <li key={item} className="flex items-center gap-2.5">
                        <CheckIcon className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-600" />
                        {item}
                      </li>
                    ),
                  )}
                </ul>
                <TrackedLink
                  href="/signup"
                  event="pricing_cta_click"
                  eventParams={{ plan: "agency" }}
                  className="mt-8 flex h-11 items-center justify-center rounded-full border border-slate-300 text-sm font-medium text-slate-900 transition-colors hover:border-slate-400 dark:border-slate-700 dark:text-slate-100 dark:hover:border-slate-600"
                >
                  Commencer gratuitement
                </TrackedLink>
              </div>
            </div>
          </ScrollReveal>
        </section>

        <section className="border-t border-slate-200 px-6 py-24 dark:border-slate-800">
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
              <TrackedLink
                href="/signup"
                event="hero_cta_click"
                eventParams={{ location: "final_cta" }}
                className="flex h-12 items-center justify-center rounded-full bg-white px-6 text-base font-medium text-brand-700 transition-colors hover:bg-brand-50"
              >
                Commencer gratuitement
              </TrackedLink>
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
            <div className="flex items-center gap-2">
              <KeurFlowMark className="h-6 w-6 shrink-0" />
              <p className="text-sm font-medium tracking-wide text-slate-900 uppercase dark:text-slate-50">
                KeurFlow
              </p>
            </div>
            <p className="mt-2 max-w-xs text-sm text-slate-500 dark:text-slate-400">
              KeurFlow aide la diaspora africaine à suivre ses projets en
              Afrique, depuis n&apos;importe où dans le monde.
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
