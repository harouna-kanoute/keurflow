# Checklist de mise en production — Phase 18

Ce que le code prépare déjà vs. ce qui nécessite tes propres comptes/décisions. Aucune de ces étapes n'a été effectuée à ta place — chacune touche un compte externe (hébergeur, paiement, domaine) ou engage de l'argent réel.

## Déjà prêt côté code

- En-têtes de sécurité (CSP, HSTS, X-Frame-Options...) — `apps/web/next.config.ts`.
- CI GitHub Actions (`typecheck`, `lint`, `test`, `build` sur chaque PR) — `.github/workflows/ci.yml`.
- `robots.txt` / `sitemap.xml` générés, `/dashboard` exclu de l'indexation.
- Pages `/mentions-legales`, `/cgu`, `/confidentialite` — **modèles à compléter**, voir plus bas.
- Toutes les migrations SQL de la Phase 1 à la Phase 17, dans l'ordre chronologique, dans `supabase/migrations/`.

## 1. Base de données de production

Deux options :

- **Réutiliser le projet Supabase actuel** (`dohnzdoexbjrbvmhqejh`) comme base de production — le plus simple, mais il contient des données de test créées pendant les phases précédentes (organisations, chantiers de test) à nettoyer avant un vrai lancement.
- **Créer un nouveau projet Supabase dédié à la production** — plus propre, mais il faut réappliquer *toutes* les migrations dans l'ordre chronologique (`ls supabase/migrations/` donne la liste), dans l'éditeur SQL, une par une comme on l'a fait jusqu'ici.

Dans les deux cas, avant d'ouvrir au public :

- Authentication → URL Configuration : mettre à jour Site URL et Redirect URLs avec le vrai domaine de production (actuellement réglés sur `localhost:3000`).
- Vérifier le quota du plan Supabase choisi (le plan gratuit n'a pas de sauvegardes automatiques ni de PITR — à considérer si les données financières des utilisateurs sont réelles dès le lancement).

## 2. Stripe en mode live

Le compte Stripe utilisé jusqu'ici est en **mode test**. Pour du vrai paiement :

1. Activer le compte Stripe (vérification d'identité/entreprise, coordonnées bancaires — directement sur le dashboard Stripe, je n'y ai pas accès).
2. Recréer le produit "Particulier" (9,90 €/mois) **en mode live** — les objets créés en mode test n'existent pas en mode live, il faut un nouveau `STRIPE_PRODUCT_ID_INDIVIDUAL`.
3. Créer un endpoint webhook dans le dashboard Stripe (mode live) pointant vers `https://<ton-domaine>/api/webhooks/stripe`, et récupérer son `STRIPE_WEBHOOK_SECRET` — **différent** de celui utilisé avec `stripe listen` en local.
4. Récupérer `STRIPE_SECRET_KEY` (live) et `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (live).

## 3. Déploiement Vercel

1. Créer un compte/projet Vercel, connecter le repo GitHub `harouna-kanoute/keurflow`.
2. Dans les réglages du projet Vercel : **Root Directory = `apps/web`** (le repo est un monorepo npm workspaces).
3. Renseigner les variables d'environnement (Production) dans Vercel :

   | Variable | Valeur |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase de prod |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clé anon du projet Supabase de prod |
   | `SUPABASE_SERVICE_ROLE_KEY` | clé service role — **à marquer sensible dans Vercel** |
   | `NEXT_PUBLIC_APP_URL` | `https://<ton-domaine>` |
   | `STRIPE_SECRET_KEY` | clé secrète Stripe **live** |
   | `STRIPE_PRODUCT_ID_INDIVIDUAL` | id du produit Stripe **live** |
   | `STRIPE_WEBHOOK_SECRET` | secret du webhook Stripe **live** créé à l'étape 2.3 |
   | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | clé publique Stripe live |

4. Domaine personnalisé : ajouter le domaine dans Vercel, suivre les instructions DNS qu'il fournit (CNAME/A record chez ton registrar).

## 4. Pages légales

Les pages `/mentions-legales`, `/cgu`, `/confidentialite` sont des **modèles** décrivant fidèlement le fonctionnement réel de l'app (données collectées, sous-traitants Supabase/Stripe/Vercel, RGPD). Avant un vrai lancement :

- Remplacer les champs `[À COMPLÉTER]` (identité de l'éditeur, adresse, email de contact, droit applicable).
- Idéalement, faire relire l'ensemble par un professionnel du droit — ce ne sont pas des documents juridiques certifiés.

## 5. Après le déploiement

- Vérifier que le webhook Stripe live reçoit bien les événements (Stripe Dashboard → Developers → Webhooks → l'endpoint créé → onglet "Events").
- Refaire un test de bout en bout du parcours d'inscription → essai → abonnement avec une vraie carte (petit montant, remboursable).
- `npm audit` : les 21 alertes actuelles viennent uniquement de l'outillage de build Expo/mobile (voir `docs/SECURITY_AUDIT_PHASE16.md`) — sans impact sur le web déployé, mais à revisiter lors d'une future mise à jour d'Expo.
