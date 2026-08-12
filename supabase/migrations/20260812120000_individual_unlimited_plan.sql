-- "Chantiers illimités" add-on for individual accounts (user request): +10€
-- on top of the existing 9,90€ individual plan removes the 1-active-project
-- cap entirely (max_active_projects = null, same convention already used by
-- agency_enterprise). Mirrors packages/config/src/plans.ts — keep both in
-- sync manually, same as every other plan row.
insert into public.plans (code, label, max_active_projects, price_minor, currency_code, trial_days, features)
values (
  'individual_unlimited',
  'Particulier — Illimité',
  null,
  1990,
  'EUR',
  0,
  '{"web": true, "mobile": true, "collaborators": true, "reports": true}'::jsonb
);

-- Re-declare create_project() once more, identical to
-- 20260811340000_project_limits_milestones_fix.sql except the trial/active-
-- subscription gate now also covers individual_unlimited — without this, a
-- canceled or past-due individual_unlimited subscription would silently
-- keep creating projects instead of being blocked like every other billable
-- plan (KF001).
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

  if v_subscription.plan_code in ('individual_trial', 'individual', 'individual_unlimited') then
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
