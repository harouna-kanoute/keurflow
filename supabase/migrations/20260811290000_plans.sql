-- Catalog table (spec §15, Phase 15). Mirrors packages/config/src/plans.ts —
-- keep both in sync manually. Prices and limits live here so changing a
-- price is an UPDATE, never a redeploy; packages/config only seeds initial
-- rows and documents the intended shape of `features`.
create table public.plans (
  code text primary key,
  label text not null,
  max_active_projects integer check (max_active_projects is null or max_active_projects > 0),
  price_minor integer not null default 0 check (price_minor >= 0),
  currency_code text not null references public.currencies (code),
  trial_days integer not null default 0 check (trial_days >= 0),
  features jsonb not null default '{}'::jsonb,
  active boolean not null default true
);

alter table public.plans enable row level security;

create policy "plans_select_all"
  on public.plans for select
  to anon, authenticated
  using (true);

-- Agency plans are intentionally priced at 0 (price_minor = 0) — B2B pricing
-- isn't decided yet (spec §100 TODO). Enforcement (create_project, below
-- migrations) only ever gates plans with a real price, so agencies aren't
-- blocked by an unfinished pricing decision.
insert into public.plans (code, label, max_active_projects, price_minor, currency_code, trial_days, features) values
  ('individual_trial', 'Essai gratuit', 1, 0, 'EUR', 7,
    '{"web": true, "mobile": true, "collaborators": true, "reports": true}'::jsonb),
  ('individual', 'Particulier', 1, 990, 'EUR', 0,
    '{"web": true, "mobile": true, "collaborators": true, "reports": true}'::jsonb),
  ('agency_starter', 'Agence — Starter', 5, 0, 'EUR', 14,
    '{"web": true, "mobile": true, "collaborators": true, "reports": true, "agencyDashboard": true}'::jsonb),
  ('agency_business', 'Agence — Business', 20, 0, 'EUR', 14,
    '{"web": true, "mobile": true, "collaborators": true, "reports": true, "agencyDashboard": true}'::jsonb),
  ('agency_enterprise', 'Agence — Enterprise', null, 0, 'EUR', 14,
    '{"web": true, "mobile": true, "collaborators": true, "reports": true, "agencyDashboard": true, "customLimits": true}'::jsonb);
