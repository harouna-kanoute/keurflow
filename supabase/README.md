# Supabase — KeurFlow

Structure:

- `migrations/` — SQL versionné (schéma, RLS, fonctions `SECURITY DEFINER`). Le schéma multi-tenant complet (organizations, projects, expenses, ...) arrive en Phase 4 ; seule `profiles` existe pour l'instant (nécessaire à l'auth, Phase 2).
- `functions/` — Edge Functions (opérations privilégiées : recalcul de dépenses, webhook Stripe, invitations).
- `seed/` — Données DEMO fictives uniquement (`Harouna`, `Agence ABC`). Jamais de données réelles.

## Prérequis

- [Supabase CLI](https://supabase.com/docs/guides/cli)
- Un projet Supabase cloud de dev (URL + clé anon dans `.env.local`), ou Docker pour `supabase start` en local.

## Commandes (depuis la racine du monorepo)

```bash
npm run supabase:start      # stack locale (nécessite Docker)
npm run supabase:diff       # génère une migration à partir des changements locaux
npm run supabase:push       # applique les migrations au projet distant
npm run supabase:gen-types  # régénère packages/types/src/database.generated.ts
```

Aucune clé réelle ne doit jamais apparaître dans ce dossier. `SUPABASE_SERVICE_ROLE_KEY` reste dans les variables d'environnement du serveur / secret manager, jamais dans `supabase/` ni dans le code versionné.
