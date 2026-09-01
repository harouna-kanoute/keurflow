import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Politique de confidentialité — KeurFlow" };

export default function ConfidentialitePage() {
  return (
    <div className="flex flex-1 flex-col items-center bg-canvas px-6 py-16">
      <div className="w-full max-w-2xl">
        <Link
          href="/"
          className="text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        >
          ← Retour
        </Link>

        <h1 className="mt-4 text-2xl font-semibold text-slate-900 dark:text-slate-50">
          Politique de confidentialité
        </h1>

        <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300">
          Ce document décrit fidèlement les données réellement traitées par
          l&apos;application au moment de la rédaction. Une relecture par un
          professionnel du droit est recommandée avant une mise en production
          réelle, notamment pour désigner un délégué à la protection des
          données si nécessaire et confirmer la base légale de chaque
          traitement.
        </p>

        <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          <section>
            <h2 className="mb-1 font-semibold text-slate-900 dark:text-slate-50">
              Données collectées
            </h2>
            <ul className="list-disc pl-5">
              <li>À l&apos;inscription : email, nom complet, pays.</li>
              <li>
                Profil (optionnel) : numéro WhatsApp, photo de profil que vous choisissez
                d&apos;ajouter.
              </li>
              <li>
                Données de projet que vous saisissez vous-même : nom et budget d&apos;un
                chantier, financements, dépenses, catégories, dates, étapes, photos et
                documents justificatifs que vous choisissez d&apos;ajouter — y compris les
                photos prises ou choisies depuis la galerie de votre téléphone dans
                l&apos;application mobile.
              </li>
              <li>
                Facturation : gérée directement par Stripe — KeurFlow ne stocke jamais de
                numéro de carte bancaire, seulement l&apos;identifiant client Stripe et le
                statut de l&apos;abonnement.
              </li>
              <li>Cookies techniques strictement nécessaires à la connexion (session, application web uniquement).</li>
            </ul>
            <p className="mt-2">
              Aucun outil de suivi publicitaire ou d&apos;analyse comportementale
              n&apos;est utilisé au moment de la rédaction, sur le web comme sur mobile.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-slate-900 dark:text-slate-50">
              Finalité du traitement
            </h2>
            <p>
              Ces données servent exclusivement à faire fonctionner le service : afficher
              vos chantiers, calculer vos totaux financiers, gérer les accès des personnes
              que vous invitez sur un projet, et gérer votre abonnement.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-slate-900 dark:text-slate-50">
              Qui peut voir vos données
            </h2>
            <p>
              Seuls les membres de votre organisation et les personnes que vous invitez
              explicitement sur un chantier y ont accès — jamais un autre client de
              KeurFlow. Cette séparation est appliquée directement au niveau de la base de
              données (Row Level Security), pas seulement dans l&apos;interface.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-slate-900 dark:text-slate-50">
              Sous-traitants
            </h2>
            <ul className="list-disc pl-5">
              <li>Supabase, Inc. — hébergement de la base de données, authentification, stockage des fichiers.</li>
              <li>Vercel Inc. — hébergement de l&apos;application web.</li>
              <li>Stripe, Inc. — traitement des paiements et de la facturation.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-slate-900 dark:text-slate-50">
              Conservation
            </h2>
            <p>
              Vos données sont conservées tant que votre compte est actif. À la suppression
              de votre compte, vos données personnelles et celles de vos chantiers sont
              supprimées, sous réserve des durées de conservation légalement imposées à nos
              sous-traitants (ex. obligations comptables de Stripe sur les données de
              facturation).
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-slate-900 dark:text-slate-50">Vos droits</h2>
            <p>
              Conformément au RGPD, vous disposez d&apos;un droit d&apos;accès, de
              rectification, d&apos;effacement et de portabilité de vos données. Votre
              compte est partagé entre l&apos;application web et l&apos;application mobile
              : vous pouvez le supprimer, ainsi que toutes ses données, depuis les réglages
              de l&apos;application web sur{" "}
              <a
                href="https://web-keurflow.vercel.app/dashboard/settings"
                className="underline"
              >
                web-keurflow.vercel.app/dashboard/settings
              </a>
              , même si vous utilisez principalement l&apos;app mobile. Pour exercer ces
              droits ou toute autre question : harounaniaka@gmail.com.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
