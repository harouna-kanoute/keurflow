# Architecture — KeurFlow

## Multi-tenant

```
Organization (individual | agency | company)
  └─ Organization Members (owner/admin/manager/member/viewer)
      └─ Projects
          └─ Project Members (project_owner/manager/member/viewer)
              └─ Project Data (fundings, expenses, expense_items, milestones,
                                photos, documents, reports, notifications, audit_logs)
```

Un particulier qui s'inscrit obtient automatiquement une organisation `type = individual` avec un seul membre (lui-même, `role = owner`). C'est le **même modèle de données** que pour une agence — pas de branchement `if (isAgency)` dans le code applicatif, seulement une donnée (`organizations.type`) qui influence l'UI (dashboard particulier vs dashboard agence) et les limites de plan.

## RLS — éviter la récursion

Écrire une policy sur `project_members` qui interroge `project_members` (même indirectement via une sous-requête `EXISTS`) provoque une récursion infinie détectée par Postgres, ou au mieux une évaluation coûteuse à chaque ligne. La solution : des fonctions `SECURITY DEFINER STABLE` qui court-circuitent RLS pour la lecture d'appartenance, appelées *depuis* les policies plutôt que d'inliner la sous-requête.

```sql
create schema if not exists private;

create or replace function private.is_org_member(p_organization_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = p_organization_id
      and user_id = auth.uid()
      and status = 'active'
  );
$$;

create or replace function private.has_org_role(p_organization_id uuid, p_min_role text)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = p_organization_id
      and user_id = auth.uid()
      and status = 'active'
      -- rank comparison against a fixed CASE, mirrors ORGANIZATION_ROLE_RANK in @keurflow/types
      and case role
            when 'owner' then 4 when 'admin' then 3 when 'manager' then 2
            when 'member' then 1 when 'viewer' then 0 end
          >= case p_min_role
            when 'owner' then 4 when 'admin' then 3 when 'manager' then 2
            when 'member' then 1 when 'viewer' then 0 end
  );
$$;

create or replace function private.is_project_member(p_project_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.project_members
    where project_id = p_project_id
      and user_id = auth.uid()
      and status = 'active'
  ) or exists (
    -- an org admin/owner can see all projects of their organization
    select 1 from public.projects p
    where p.id = p_project_id
      and private.has_org_role(p.organization_id, 'admin')
  );
$$;
```

Toutes les tables de données de projet (`fundings`, `expenses`, `milestones`, `photos`, `documents`, ...) portent une policy du type :

```sql
alter table public.expenses enable row level security;
alter table public.expenses force row level security;

create policy "project members can read expenses"
  on public.expenses for select
  using (private.is_project_member(project_id));

create policy "project members can insert expenses"
  on public.expenses for insert
  with check (private.is_project_member(project_id));
```

Les policies `update`/`delete` sensibles (ex. approuver une dépense) exigent en plus `private.has_project_role(project_id, 'project_manager')`.

## Montants monétaires

Tous les montants sont des `bigint` en unité mineure de la devise (centimes pour EUR, unité entière pour XOF/XAF/GNF qui n'ont pas de décimales). Jamais de `numeric`/`float` pour un montant qui sera additionné — voir `packages/business/src/money.ts`. Le total d'une dépense avec `expense_items` est **recalculé côté serveur** (trigger `before insert or update` ou Edge Function), jamais persisté tel que soumis par le client.

## Storage

Convention de chemin : `{project_id}/{entity}/{uuid}.{ext}`. Les policies Storage extraient `project_id` du chemin (`storage.foldername(name)[1]`) et appellent `private.is_project_member(...)`. Accès en lecture exclusivement via URL signée à courte durée de vie générée côté serveur — jamais de bucket public pour des données privées.

## Rôles : organisation vs projet

Volontairement séparés. Un `manager` d'organisation n'a pas automatiquement tous les droits sur tous les projets — l'appartenance projet (`project_members`) est explicite, sauf pour `admin`/`owner` d'organisation qui voient tout (utile pour le dashboard agence). Un client d'agence n'est jamais membre de l'organisation, seulement du (ou des) projet(s) qui le concernent — c'est ce qui garantit qu'il ne voit jamais les autres clients.
