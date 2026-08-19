# Checklist de mise en production — Phase 18

## État actuel : déployé, en mode test

L'app tourne en production sur **https://web-keurflow.vercel.app** (Vercel, projet `keurflow/web`, déploiement automatique à chaque push sur `main`). Base de données : le projet Supabase existant (`dohnzdoexbjrbvmhqejh`), réutilisé tel quel.

**Stripe est encore en mode test** — les paiements ne débitent personne pour de vrai. Voir §2 pour passer en mode live.

**⚠️ L'inscription par email est actuellement cassée pour de vrais utilisateurs** — voir §0, bloquant tant qu'aucun domaine n'est vérifié.

## Fait

- [x] Projet Vercel créé et lié au repo GitHub (`Root Directory = apps/web`, déploiement auto sur push `main`).
- [x] Variables d'environnement de production configurées dans Vercel : Supabase (URL, anon key, service role key), Stripe (clés **test**), `NEXT_PUBLIC_APP_URL`, `STRIPE_WEBHOOK_SECRET` (endpoint test pointant vers l'URL de prod).
- [x] Config Auth Supabase (Site URL / Redirect URLs) mise à jour vers `https://web-keurflow.vercel.app`.
- [x] En-têtes de sécurité (CSP, HSTS, X-Frame-Options...) vérifiés actifs en prod.
- [x] `robots.txt` / `sitemap.xml`, pages légales (`/mentions-legales`, `/cgu`, `/confidentialite` — **modèles à compléter**, voir §4).
- [x] CI GitHub Actions active sur chaque PR.
- [x] SMTP personnalisé (Resend) activé dans Supabase — connexion fonctionnelle, mais voir §0 : reste bloqué en mode sandbox.

## 0. BLOQUANT — Email de confirmation ne fonctionne pas pour de vrais utilisateurs

**Symptôme observé** : l'inscription échoue avec `Error sending confirmation email`, ou "réussit" silencieusement sans rien envoyer.

**Cause identifiée** (diagnostiquée en direct sur la prod) :
- Le service email intégré de Supabase (sans SMTP personnalisé) n'est pas fiable en production — normal, prévu pour les tests uniquement.
- SMTP personnalisé (Resend) activé, mais **sans domaine vérifié** : le sender `onboarding@resend.dev` de Resend ne peut livrer qu'à l'adresse exacte du compte Resend lui-même — toute autre adresse (même un simple `+test1` sur la même boîte Gmail) est rejetée. Confirmé en testant les deux cas.
- Effet de bord découvert au passage (comportement Supabase normal, pas un bug) : si on s'inscrit avec un email qui a déjà un compte confirmé, Supabase répond "succès" sans rien envoyer — anti-énumération. Peut ressembler à un email perdu alors qu'aucun n'a jamais été censé partir.

**Fix requis** : acheter/utiliser un nom de domaine, le vérifier sur Resend (https://resend.com/domains, enregistrements DNS fournis), changer le **Sender email** dans Supabase pour une adresse de ce domaine (ex. `noreply@tondomaine.com`). Ce domaine peut aussi servir de domaine personnalisé pour l'app elle-même (§3) — un seul achat pour les deux besoins.

**Tant que ce n'est pas fait** : personne ne peut créer de compte fonctionnel via `/signup` en production (aucun email de confirmation ne partira jamais réellement). Les comptes de test existants (`rouna50@gmail.com`, `harounaniaka@gmail.com`) restent utilisables pour se connecter, eux.

## Reste à faire avant un vrai lancement public

### 1. Nettoyer les données de test

Le projet Supabase contient des organisations/chantiers créés pendant les phases précédentes (`runa`, `Maison familiale Harouna`, chantiers de test). À nettoyer via l'éditeur SQL avant d'inviter de vrais utilisateurs — dis-moi quand tu veux le faire, je peux te donner les requêtes.

### 2. Stripe en mode live

1. Activer le compte Stripe (vérification d'identité/entreprise, coordonnées bancaires — sur le dashboard Stripe, je n'y ai pas accès).
2. Recréer le produit "Particulier" (9,90 €/mois) **en mode live** — nouveau `STRIPE_PRODUCT_ID_INDIVIDUAL`.
3. Créer un endpoint webhook **live** pointant vers `https://web-keurflow.vercel.app/api/webhooks/stripe` (ou le domaine final), récupérer son secret.
4. Remplacer dans Vercel : `STRIPE_SECRET_KEY`, `STRIPE_PRODUCT_ID_INDIVIDUAL`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` par les valeurs **live**.

### 3. Domaine personnalisé (en pratique requis, voir §0)

Pas juste "joli à avoir" — c'est le fix du blocage email de §0. Une fois le domaine acheté :

1. Vercel Dashboard → Project → Settings → Domains → ajouter le domaine, suivre les instructions DNS.
2. Resend → Domains → ajouter le même domaine, suivre ses instructions DNS (enregistrements différents de ceux de Vercel, les deux coexistent).
3. Mettre à jour `NEXT_PUBLIC_APP_URL` dans Vercel et le Site URL/Redirect URLs dans Supabase Auth avec le nouveau domaine.
4. Mettre à jour le Sender email dans Supabase SMTP Settings avec une adresse du nouveau domaine.
5. Redéployer.

### 4. Pages légales

Remplacer les `[À COMPLÉTER]` (identité de l'éditeur, adresse, email de contact, droit applicable) dans `/mentions-legales` et `/cgu`. Idéalement, faire relire l'ensemble par un professionnel du droit.

### 5. Test de bout en bout avant ouverture publique

- Inscription → essai 14 jours → abonnement avec une vraie carte (mode live, petit montant remboursable).
- Vérifier que le webhook live reçoit bien les événements (Stripe Dashboard → Developers → Webhooks → endpoint → onglet Events).
- Plan Supabase : le plan gratuit n'a pas de sauvegardes automatiques ni de PITR — à considérer si des données financières réelles sont en jeu dès le lancement.

## Note

`npm audit` : les 21 alertes actuelles viennent uniquement de l'outillage de build Expo/mobile (voir `docs/SECURITY_AUDIT_PHASE16.md`) — sans impact sur le web déployé.
