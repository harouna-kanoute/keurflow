-- SECURITY FIX (medium): create_project()'s paywall check only ever gated
-- ('individual_trial', 'individual') — the original two billable plans from
-- when this check was first written. individual_unlimited became billable
-- in 20260812120000_individual_unlimited_plan.sql, and agency_starter /
-- agency_business became billable in 20260819040000_agency_billing_paywall.sql,
-- but both additions only ever landed on now-dropped stale overloads of this
-- function (see 20260822000000_drop_stale_create_project_overloads.sql) —
-- never on this, the one 12-parameter overload the app actually calls. Net
-- effect: organizations on individual_unlimited/agency_starter/agency_business
-- were never blocked from creating projects, even with an expired trial or a
-- past_due/canceled/incomplete subscription.
--
-- Re-declares create_project() with the *same* 12-parameter signature as
-- 20260813040000_project_dates.sql (CREATE OR REPLACE on an identical
-- signature replaces in place — no new overload), identical in every way
-- except the plan_code list below now matches BILLABLE_PLAN_CODES in
-- packages/business/src/subscription.ts exactly.
create or replace function public.create_project(
  p_organization_id uuid,
  p_name text,
  p_description text,
  p_project_type text,
  p_country_id uuid,
  p_city text,
  p_budget_minor bigint,
  p_currency_code text,
  p_address text,
  p_surface_area numeric,
  p_start_date date,
  p_expected_end_date date
)
returns public.projects
language plpgsql
security definer
set search_path = public
as $$
declare
  new_project public.projects;
  v_subscription public.subscriptions;
  v_plan public.plans;
  v_active_count integer;
  milestone_name text;
  milestone_index integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if coalesce(public.get_organization_role(p_organization_id), '') not in ('owner', 'admin', 'manager') then
    raise exception 'Insufficient organization role';
  end if;

  select * into v_subscription from public.subscriptions where organization_id = p_organization_id;
  select * into v_plan from public.plans where code = v_subscription.plan_code;

  if v_subscription.plan_code in (
    'individual_trial', 'individual', 'individual_unlimited', 'agency_starter', 'agency_business'
  ) then
    if v_subscription.status = 'trialing' and v_subscription.trial_ends_at < now() then
      raise exception 'Trial expired — an active subscription is required' using errcode = 'KF001';
    end if;
    if v_subscription.status in ('past_due', 'canceled', 'incomplete') then
      raise exception 'Subscription is not active' using errcode = 'KF001';
    end if;
  end if;

  if v_plan.max_active_projects is not null then
    select count(*) into v_active_count
      from public.projects
      where organization_id = p_organization_id and status <> 'archived';

    if v_active_count >= v_plan.max_active_projects then
      raise exception 'Project limit reached for the current plan' using errcode = 'KF002';
    end if;
  end if;

  insert into public.projects (
    organization_id, owner_id, name, description, project_type,
    country_id, city, budget_minor, currency_code, address, surface_area,
    start_date, expected_end_date
  )
  values (
    p_organization_id, auth.uid(), p_name, p_description, p_project_type,
    p_country_id, p_city, p_budget_minor, p_currency_code, p_address, p_surface_area,
    p_start_date, p_expected_end_date
  )
  returning * into new_project;

  insert into public.project_members (project_id, user_id, role, status)
  values (new_project.id, auth.uid(), 'project_owner', 'active');

  foreach milestone_name in array array[
    'Terrain', 'Fondations', 'Murs', 'Toiture', 'Électricité',
    'Plomberie', 'Menuiserie', 'Carrelage', 'Peinture', 'Finitions'
  ]
  loop
    insert into public.milestones (project_id, name, order_index)
    values (new_project.id, milestone_name, milestone_index);
    milestone_index := milestone_index + 1;
  end loop;

  return new_project;
end;
$$;
