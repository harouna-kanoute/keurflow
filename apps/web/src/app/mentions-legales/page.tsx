import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Mentions légales — KeurFlow" };

export default function MentionsLegalesPage() {
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
          Mentions légales
        </h1>

        <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300">
          Modèle à compléter avant une mise en production réelle — les champs
          marqués [À COMPLÉTER] nécessitent les informations réelles de
          l&apos;éditeur (statut juridique, SIRET le cas échéant, adresse). Une
          relecture par un professionnel du droit est recommandée avant
          publication.
        </p>

        <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          <section>
            <h2 className="mb-1 font-semibold text-slate-900 dark:text-slate-50">Éditeur du site</h2>
            <p>
              KeurFlow est édité par [À COMPLÉTER — nom / raison sociale],
              [À COMPLÉTER — statut : entreprise individuelle, société...],
              [À COMPLÉTER — adresse].
              <br />
              Contact : [À COMPLÉTER — adresse email de contact]
              <br />
              Directeur de la publication : [À COMPLÉTER]
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-slate-900 dark:text-slate-50">Hébergement</h2>
            <p>
              Application web hébergée par Vercel Inc. (San Francisco, États-Unis).
              <br />
              Base de données, authentification et stockage de fichiers hébergés par
              Supabase, Inc.
              <br />
              Paiements traités par Stripe, Inc. — KeurFlow ne stocke aucune donnée
              de carte bancaire (voir la{" "}
              <Link href="/confidentialite" className="underline">
                politique de confidentialité
              </Link>
              ).
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-slate-900 dark:text-slate-50">
              Propriété intellectuelle
            </h2>
            <p>
              La marque KeurFlow, son logo et son contenu éditorial sont la propriété
              de l&apos;éditeur. Les données que vous saisissez (projets, dépenses,
              documents, photos) vous appartiennent — voir la{" "}
              <Link href="/confidentialite" className="underline">
                politique de confidentialité
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
