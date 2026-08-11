-- Enforce the plan's project limit and trial/paywall state (spec §15,
-- Phase 15) directly in create_project() — the only insert path for
-- projects — so a client can never bypass it by calling the table
-- directly (there is no INSERT policy on projects; see
-- 20260811170000_project_members.sql).
--
-- Only plans with a real price (price_minor > 0) are ever gated: agency
-- plans are still priced at 0 pending a B2B pricing decision (spec §100
-- TODO), so agencies are never blocked by billing state in this phase.
create or replace function public.create_project(
  p_organization_id uuid,
  p_name text,
  p_description text,
  p_project_type text,
  p_country_id uuid,
  p_city text,
  p_budget_minor bigint,
  p_currency_code text
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
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if public.get_organization_role(p_organization_id) not in ('owner', 'admin', 'manager') then
    raise exception 'Insufficient organization role';
  end if;

  select * into v_subscription from public.subscriptions where organization_id = p_organization_id;
  select * into v_plan from public.plans where code = v_subscription.plan_code;

  if v_plan.price_minor > 0 then
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
    country_id, city, budget_minor, currency_code
  )
  values (
    p_organization_id, auth.uid(), p_name, p_description, p_project_type,
    p_country_id, p_city, p_budget_minor, p_currency_code
  )
  returning * into new_project;

  insert into public.project_members (project_id, user_id, role, status)
  values (new_project.id, auth.uid(), 'project_owner', 'active');

  return new_project;
end;
$$;
