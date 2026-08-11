-- Multi-tenant foundation (spec §13-24, §63). Every project/expense/document
-- table added from Phase 4 onward hangs off organization_id (directly or via
-- projects), and every RLS policy on those tables reduces to "is the current
-- user an active member of the owning organization?" — enforced here once,
-- reused everywhere via the two SECURITY DEFINER helpers below.
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  type text not null check (type in ('individual', 'agency', 'company')),
  country_id uuid not null references public.countries (id),
  owner_id uuid not null references auth.users (id),
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.organizations enable row level security;

create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'manager', 'member', 'viewer')),
  status text not null default 'active' check (status in ('invited', 'active', 'suspended', 'removed')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

alter table public.organization_members enable row level security;

-- SECURITY DEFINER + fixed search_path + STABLE: safe to call from inside RLS
-- policies on organizations/organization_members without the recursion that
-- would happen if those policies queried organization_members directly
-- through a normal (RLS-checked) subquery.
create function public.is_organization_member(target_organization_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = target_organization_id
      and user_id = auth.uid()
      and status = 'active'
  );
$$;

create function public.get_organization_role(target_organization_id uuid)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role
  from public.organization_members
  where organization_id = target_organization_id
    and user_id = auth.uid()
    and status = 'active'
  limit 1;
$$;

-- A user only ever sees organizations they belong to — never another
-- tenant's, regardless of how the id was obtained (spec §12, §64, §82).
create policy "organizations_select_members"
  on public.organizations for select
  to authenticated
  using (public.is_organization_member(id));

create policy "organizations_update_admins"
  on public.organizations for update
  to authenticated
  using (public.get_organization_role(id) in ('owner', 'admin'))
  with check (public.get_organization_role(id) in ('owner', 'admin'));

-- No INSERT policy: creation goes through create_organization() below so the
-- organization row and the owner's membership row are created atomically —
-- a plain client-side INSERT would leave the org with zero members (and
-- get_organization_role() would then deny the creator access to their own row).

create policy "organization_members_select_same_org"
  on public.organization_members for select
  to authenticated
  using (public.is_organization_member(organization_id));

create policy "organization_members_manage_admins"
  on public.organization_members for all
  to authenticated
  using (public.get_organization_role(organization_id) in ('owner', 'admin'))
  with check (public.get_organization_role(organization_id) in ('owner', 'admin'));

-- Creates an organization and its owner membership row in one transaction.
-- SECURITY DEFINER is required precisely because, before this call, no
-- organization_members row exists yet for the caller to be authorized by.
create function public.create_organization(org_name text, org_type text, org_country_id uuid)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org public.organizations;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if org_type not in ('individual', 'agency', 'company') then
    raise exception 'Invalid organization type';
  end if;

  insert into public.organizations (name, type, country_id, owner_id)
  values (org_name, org_type, org_country_id, auth.uid())
  returning * into new_org;

  insert into public.organization_members (organization_id, user_id, role, status)
  values (new_org.id, auth.uid(), 'owner', 'active');

  return new_org;
end;
$$;

grant execute on function public.create_organization(text, text, uuid) to authenticated;
