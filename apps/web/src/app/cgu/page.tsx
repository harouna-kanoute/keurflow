import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Conditions générales d'utilisation — KeurFlow" };

export default function CGUPage() {
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
          Conditions générales d&apos;utilisation
        </h1>

        <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300">
          Modèle décrivant le fonctionnement réel du service — une relecture par
          un professionnel du droit est recommandée avant une mise en
          production réelle, notamment sur la juridiction applicable et la
          limitation de responsabilité.
        </p>

        <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          <section>
            <h2 className="mb-1 font-semibold text-slate-900 dark:text-slate-50">1. Objet</h2>
            <p>
              KeurFlow est un service permettant de suivre à distance un projet immobilier
              ou de construction : financements reçus, dépenses engagées, justificatifs,
              étapes du chantier et photos. Le service est accessible via le web et une
              application mobile.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-slate-900 dark:text-slate-50">2. Compte et abonnement</h2>
            <p>
              La création d&apos;un compte particulier ouvre un essai gratuit de 14 jours
              limité à un chantier actif. Passé ce délai, la poursuite du service nécessite
              un abonnement payant (9,90 € / mois au moment de la rédaction), facturé via
              Stripe. L&apos;abonnement peut être résilié à tout moment depuis la page
              Abonnement ; la résiliation prend effet à la fin de la période déjà payée.
              Les offres pour les agences/entreprises font l&apos;objet d&apos;une
              tarification à négocier séparément.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-slate-900 dark:text-slate-50">
              3. Responsabilités de l&apos;utilisateur
            </h2>
            <p>
              L&apos;utilisateur est responsable de l&apos;exactitude des informations
              qu&apos;il saisit (montants, justificatifs, description des travaux) et de
              la confidentialité de ses identifiants de connexion. KeurFlow est un outil
              de suivi et de transparence ; il ne constitue ni un conseil juridique, ni un
              conseil financier, ni une garantie sur la bonne exécution des travaux par un
              tiers.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-slate-900 dark:text-slate-50">
              4. Disponibilité et évolution du service
            </h2>
            <p>
              KeurFlow met en œuvre des moyens raisonnables pour assurer la disponibilité
              du service, sans garantie de continuité absolue. Les fonctionnalités peuvent
              évoluer ; les changements substantiels affectant un abonnement en cours
              seront communiqués aux utilisateurs concernés.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-slate-900 dark:text-slate-50">5. Résiliation</h2>
            <p>
              L&apos;utilisateur peut supprimer son compte à tout moment en en faisant la
              demande. L&apos;éditeur peut suspendre un compte en cas d&apos;usage
              contraire aux présentes conditions ou à la loi applicable.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-slate-900 dark:text-slate-50">
              6. Droit applicable
            </h2>
            <p>[À COMPLÉTER — droit applicable et juridiction compétente].</p>
          </section>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Voir aussi la{" "}
            <Link href="/confidentialite" className="underline">
              politique de confidentialité
            </Link>{" "}
            et les{" "}
            <Link href="/mentions-legales" className="underline">
              mentions légales
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
