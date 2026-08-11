-- Projects (spec §22). Table only — RLS policies, the SECURITY DEFINER
-- helpers they depend on, and create_project() live in the next migration
-- because they need project_members to exist first (and project_members
-- needs this table to exist first, for its FK), so neither can precede
-- the other as a single self-contained migration.
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  owner_id uuid not null references auth.users (id),
  name text not null check (char_length(name) between 2 and 160),
  description text check (char_length(description) <= 2000),
  project_type text not null check (char_length(project_type) between 1 and 60),
  country_id uuid not null references public.countries (id),
  city text check (char_length(city) <= 120),
  budget_minor bigint not null default 0 check (budget_minor >= 0),
  currency_code text not null references public.currencies (code),
  start_date date,
  expected_end_date date,
  status text not null default 'planning'
    check (status in ('planning', 'active', 'paused', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects enable row level security;

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();
