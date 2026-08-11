# Checklist de mise en production — Phase 18

## État actuel : déployé, en mode test

L'app tourne en production sur **https://web-keurflow.vercel.app** (Vercel, projet `keurflow/web`, déploiement automatique à chaque push sur `main`). Base de données : le projet Supabase existant (`dohnzdoexbjrbvmhqejh`), réutilisé tel quel.

**Stripe est encore en mode test** — les paiements ne débitent personne pour de vrai. Voir §2 pour passer en mode live.

## Fait

- [x] Projet Vercel créé et lié au repo GitHub (`Root Directory = apps/web`, déploiement auto sur push `main`).
- [x] Variables d'environnement de production configurées dans Vercel : Supabase (URL, anon key, service role key), Stripe (clés **test**), `NEXT_PUBLIC_APP_URL`, `STRIPE_WEBHOOK_SECRET` (endpoint test pointant vers l'URL de prod).
- [x] Config Auth Supabase (Site URL / Redirect URLs) mise à jour vers `https://web-keurflow.vercel.app`.
- [x] En-têtes de sécurité (CSP, HSTS, X-Frame-Options...) vérifiés actifs en prod.
- [x] `robots.txt` / `sitemap.xml`, pages légales (`/mentions-legales`, `/cgu`, `/confidentialite` — **modèles à compléter**, voir §4).
- [x] CI GitHub Actions active sur chaque PR.

## Reste à faire avant un vrai lancement public

### 1. Nettoyer les données de test

Le projet Supabase contient des organisations/chantiers créés pendant les phases précédentes (`runa`, `Maison familiale Harouna`, chantiers de test). À nettoyer via l'éditeur SQL avant d'inviter de vrais utilisateurs — dis-moi quand tu veux le faire, je peux te donner les requêtes.

### 2. Stripe en mode live

1. Activer le compte Stripe (vérification d'identité/entreprise, coordonnées bancaires — sur le dashboard Stripe, je n'y ai pas accès).
2. Recréer le produit "Particulier" (9,90 €/mois) **en mode live** — nouveau `STRIPE_PRODUCT_ID_INDIVIDUAL`.
3. Créer un endpoint webhook **live** pointant vers `https://web-keurflow.vercel.app/api/webhooks/stripe` (ou le domaine final), récupérer son secret.
4. Remplacer dans Vercel : `STRIPE_SECRET_KEY`, `STRIPE_PRODUCT_ID_INDIVIDUAL`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` par les valeurs **live**.

### 3. Domaine personnalisé (optionnel)

Vercel Dashboard → Project → Settings → Domains → ajouter le domaine, suivre les instructions DNS. Une fois fait, mettre à jour `NEXT_PUBLIC_APP_URL` dans Vercel et le Site URL/Redirect URLs dans Supabase Auth avec le nouveau domaine, puis redéployer.

### 4. Pages légales

Remplacer les `[À COMPLÉTER]` (identité de l'éditeur, adresse, email de contact, droit applicable) dans `/mentions-legales` et `/cgu`. Idéalement, faire relire l'ensemble par un professionnel du droit.

### 5. Test de bout en bout avant ouverture publique

- Inscription → essai 7 jours → abonnement avec une vraie carte (mode live, petit montant remboursable).
- Vérifier que le webhook live reçoit bien les événements (Stripe Dashboard → Developers → Webhooks → endpoint → onglet Events).
- Plan Supabase : le plan gratuit n'a pas de sauvegardes automatiques ni de PITR — à considérer si des données financières réelles sont en jeu dès le lancement.

## Note

`npm audit` : les 21 alertes actuelles viennent uniquement de l'outillage de build Expo/mobile (voir `docs/SECURITY_AUDIT_PHASE16.md`) — sans impact sur le web déployé.
