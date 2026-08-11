-- Subscriptions (spec §15, Phase 15) — one row per organization, one active
-- plan at a time. Stripe is the source of truth for billing state; this
-- table is a read cache kept in sync by the webhook handler (apps/web
-- /api/webhooks/stripe) using the service-role admin client, since a
-- webhook request has no user session to satisfy RLS with.
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations (id) on delete cascade,
  plan_code text not null references public.plans (code),
  status text not null
    check (status in ('trialing', 'active', 'past_due', 'canceled', 'incomplete')),
  stripe_customer_id text,
  stripe_subscription_id text,
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

create policy "subscriptions_select_members"
  on public.subscriptions for select
  to authenticated
  using (public.is_organization_member(organization_id));

-- No insert/update/delete policy for `authenticated`: the initial row is
-- created by create_organization() (SECURITY DEFINER, below) and every
-- subsequent change comes from the Stripe webhook via the admin client,
-- which bypasses RLS entirely — never from a client-side write.

-- Re-declare create_organization() (originally defined in
-- 20260811140000_organizations.sql) to also bootstrap a trialing
-- subscription — individual orgs get the 7-day/1-project trial, agencies
-- get the 14-day starter trial. Same signature, so this is a drop-in
-- replacement; Postgres keeps the existing grant.
create or replace function public.create_organization(org_name text, org_type text, org_country_id uuid)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org public.organizations;
  v_plan_code text;
  v_trial_days integer;
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

  v_plan_code := case when org_type = 'individual' then 'individual_trial' else 'agency_starter' end;
  select trial_days into v_trial_days from public.plans where code = v_plan_code;

  insert into public.subscriptions (organization_id, plan_code, status, trial_ends_at)
  values (new_org.id, v_plan_code, 'trialing', now() + make_interval(days => v_trial_days));

  return new_org;
end;
$$;

-- One-time backfill: organizations created before this migration have no
-- subscription row. Without one, create_project()'s gating (next migration)
-- fails open — harmless for now, but give every existing org a trial row
-- too so behavior is consistent for old and new organizations alike.
insert into public.subscriptions (organization_id, plan_code, status, trial_ends_at)
select
  o.id,
  case when o.type = 'individual' then 'individual_trial' else 'agency_starter' end,
  'trialing',
  now() + make_interval(days => (
    select trial_days from public.plans
    where code = case when o.type = 'individual' then 'individual_trial' else 'agency_starter' end
  ))
from public.organizations o
where not exists (select 1 from public.subscriptions s where s.organization_id = o.id);
