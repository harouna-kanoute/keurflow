-- profiles: one row per auth.users, minimal PII only (data minimization, spec §19).
-- Row is created automatically by handle_new_user() below — never inserted directly
-- by the app — so there is intentionally no INSERT policy for authenticated users.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (char_length(full_name) <= 120),
  phone text,
  avatar_url text,
  country_id uuid, -- FK to public.countries added once that table exists (Phase 4)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- A user can only ever see/edit their own profile — never another user's,
-- regardless of organization or project membership (spec §12, §63).
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Auto-provision a profile row whenever a new Supabase Auth user is created.
-- SECURITY DEFINER is required because the inserting role (the auth system)
-- has no RLS-granted access to public.profiles otherwise.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Reusable updated_at trigger — every future table with an updated_at column
-- (organizations, projects, expenses, ...) attaches this same function.
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
