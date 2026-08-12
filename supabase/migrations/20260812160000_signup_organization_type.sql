-- Signup now lets the user pick their organization type (user request: no
-- way to choose particulier vs agence immobilière at signup). Re-declare
-- handle_new_user() once more — identical to 20260811320000 except it reads
-- 'organization_type' from the new user's metadata instead of hardcoding
-- 'individual', and branches the trial plan the same way create_organization()
-- already does (20260811300000): individual -> individual_trial (7 days),
-- agency/company -> agency_starter (14 days).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_full_name text := new.raw_user_meta_data ->> 'full_name';
  meta_country_code text := new.raw_user_meta_data ->> 'country_code';
  meta_org_type text := new.raw_user_meta_data ->> 'organization_type';
  resolved_country_id uuid;
  resolved_org_type text;
  new_org_id uuid;
  v_plan_code text;
  v_trial_days integer;
begin
  select id into resolved_country_id
  from public.countries
  where code = meta_country_code;

  -- Client-supplied metadata is never trusted as-is (§69/§83) — fall back to
  -- 'individual' for anything missing or outside the three valid types,
  -- same allow-list create_organization() enforces.
  resolved_org_type := case
    when meta_org_type in ('individual', 'agency', 'company') then meta_org_type
    else 'individual'
  end;

  insert into public.profiles (id, full_name, country_id)
  values (new.id, meta_full_name, resolved_country_id);

  -- Without a resolvable country (missing/unknown code) we still create the
  -- profile above but skip the organization — it can be created later from
  -- the app once the user picks a country, rather than failing signup outright.
  if resolved_country_id is not null then
    insert into public.organizations (name, type, country_id, owner_id)
    values (
      coalesce(nullif(trim(meta_full_name), ''), 'Mon espace'),
      resolved_org_type,
      resolved_country_id,
      new.id
    )
    returning id into new_org_id;

    insert into public.organization_members (organization_id, user_id, role, status)
    values (new_org_id, new.id, 'owner', 'active');

    v_plan_code := case when resolved_org_type = 'individual' then 'individual_trial' else 'agency_starter' end;
    select trial_days into v_trial_days from public.plans where code = v_plan_code;

    insert into public.subscriptions (organization_id, plan_code, status, trial_ends_at)
    values (new_org_id, v_plan_code, 'trialing', now() + make_interval(days => v_trial_days));
  end if;

  return new;
end;
$$;
