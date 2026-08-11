-- Bug fix (Phase 15): handle_new_user() (20260811150000) auto-provisions an
-- individual organization at signup by inserting into organizations/
-- organization_members directly — it never went through create_organization()
-- (20260811140000, updated by 20260811300000), so organizations created via
-- signup never got a subscription row. Re-declare it once more to also
-- bootstrap the same 7-day individual_trial subscription.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_full_name text := new.raw_user_meta_data ->> 'full_name';
  meta_country_code text := new.raw_user_meta_data ->> 'country_code';
  resolved_country_id uuid;
  new_org_id uuid;
  v_trial_days integer;
begin
  select id into resolved_country_id
  from public.countries
  where code = meta_country_code;

  insert into public.profiles (id, full_name, country_id)
  values (new.id, meta_full_name, resolved_country_id);

  -- Without a resolvable country (missing/unknown code) we still create the
  -- profile above but skip the organization — it can be created later from
  -- the app once the user picks a country, rather than failing signup outright.
  if resolved_country_id is not null then
    insert into public.organizations (name, type, country_id, owner_id)
    values (coalesce(nullif(trim(meta_full_name), ''), 'Mon espace'), 'individual', resolved_country_id, new.id)
    returning id into new_org_id;

    insert into public.organization_members (organization_id, user_id, role, status)
    values (new_org_id, new.id, 'owner', 'active');

    select trial_days into v_trial_days from public.plans where code = 'individual_trial';

    insert into public.subscriptions (organization_id, plan_code, status, trial_ends_at)
    values (new_org_id, 'individual_trial', 'trialing', now() + make_interval(days => v_trial_days));
  end if;

  return new;
end;
$$;

-- Backfill: organizations created via signup before this fix (e.g. any
-- individual org already missing a subscription row).
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
