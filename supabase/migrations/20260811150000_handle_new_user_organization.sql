-- Replaces handle_new_user() (from 20260811100000_profiles.sql) to also set
-- profiles.country_id and auto-provision a personal "individual" organization
-- + owner membership at signup — this is what makes the B2C flow (§103) work
-- without an explicit "create your organization" step for individuals.
-- The trigger created in the earlier migration still points at this function
-- by name, so it does not need to be recreated.
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
  end if;

  return new;
end;
$$;
