# KeurFlow

Suivi, transparence et traçabilité des projets immobiliers en Afrique — pour la diaspora et pour les agences immobilières / entreprises de construction.

> « Je finance un projet à distance. Je veux savoir où en est mon projet et où va mon argent. »

## Statut

🚧 En construction — **Phase 1 (Architecture)**. Voir [`docs/ROADMAP.md`](docs/ROADMAP.md) pour la feuille de route complète en 18 phases.

## Stack

| Couche | Techno |
|---|---|
| Web | Next.js (App Router) + React + TypeScript |
| Mobile | Expo + React Native + TypeScript *(Phase 14)* |
| Backend | Supabase (Postgres, Auth, Storage, RLS, Edge Functions) |
| Validation | Zod (`packages/validation`, partagé web/mobile/serveur) |
| UI | Tailwind CSS |
| Formulaires | React Hook Form |
| Icônes | Lucide |
| Graphiques | Recharts |

## Structure du monorepo

```
keurflow/
├── apps/
│   ├── web/            Next.js
│   └── mobile/         Expo (Phase 14)
├── packages/
│   ├── types/           Types domaine + types DB générés
│   ├── validation/       Schémas Zod (source unique de vérité)
│   ├── business/         Budget, permissions UI, calculs — logique pure sans I/O
│   └── config/           Pays, devises, moyens de paiement, catégories, jalons, plans
├── supabase/
│   ├── migrations/       SQL versionné (schéma + RLS)
│   ├── functions/        Edge Functions
│   └── seed/             Données DEMO fictives uniquement
└── docs/
```

npm workspaces (pas de Turborepo/Nx pour l'instant — simplicité pour un dev solo, voir §99 du prompt produit).

## Installation

```bash
nvm install   # ou installer Node 22+ manuellement — voir .nvmrc
npm install
cp .env.example apps/web/.env.local   # puis remplir avec vos propres valeurs
npm run dev:web
```

## Variables d'environnement

Voir [`.env.example`](.env.example). Aucune vraie clé n'est jamais commitée — voir [`SECURITY.md`](SECURITY.md).

## Multi-tenant

```
Organization (individual | agency | company)
  └─ Organization Members (owner/admin/manager/member/viewer)
      └─ Projects
          └─ Project Members (project_owner/manager/member/viewer)
              └─ Project Data (fundings, expenses, milestones, photos, documents)
```

Isolation stricte entre tenants, appliquée à **chaque** couche (DB, RLS, Storage, API, frontend) — voir [`SECURITY.md`](SECURITY.md).

## Sécurité

Lire [`SECURITY.md`](SECURITY.md) avant toute contribution. Règle non négociable : si quelqu'un possède le code source, il ne doit jamais pouvoir en extraire un secret de production ni accéder aux données d'un autre tenant.

## Licence

Propriétaire — tous droits réservés.
