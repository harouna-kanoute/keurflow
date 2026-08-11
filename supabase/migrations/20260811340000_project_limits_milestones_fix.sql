-- Bug fixes (Phase 16 security/correctness audit):
--
-- 1. CRITICAL — every version of create_project() since 20260811170000
--    guarded on `if get_organization_role(p_organization_id) not in
--    ('owner','admin','manager') then raise exception`. When the caller has
--    NO membership row in the target organization at all,
--    get_organization_role() returns NULL, and `NULL not in (...)`
--    evaluates to NULL — which plpgsql's IF treats as false, silently
--    skipping the exception. Confirmed live: an authenticated user with no
--    relationship whatsoever to another tenant's organization could call
--    this RPC directly (bypassing the UI) with that org's id and have a
--    project inserted into it. Fixed with `coalesce(..., '')` so a NULL
--    role reliably fails the check instead of silently passing it.
--
-- 2. 20260811310000 and 20260811330000 (Phase 15) each re-declared
--    create_project() by copying the version from
--    20260811170000_project_members.sql — silently dropping the
--    default-milestone-seeding behavior added on top of it by
--    20260811240000_milestones.sql. Every project created since Phase 15
--    shipped got no starter milestone template. Re-declared once more with
--    both the subscription/paywall gating (Phase 15) and the milestone
--    seeding (Phase 9) together.
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

  -- coalesce(..., '') is load-bearing: without it, a caller with NO
  -- membership row in this organization gets NULL back from
  -- get_organization_role(), and `NULL not in (...)` is NULL — which IF
  -- treats as false, silently skipping this guard entirely.
  if coalesce(public.get_organization_role(p_organization_id), '') not in ('owner', 'admin', 'manager') then
    raise exception 'Insufficient organization role';
  end if;

  select * into v_subscription from public.subscriptions where organization_id = p_organization_id;
  select * into v_plan from public.plans where code = v_subscription.plan_code;

  if v_subscription.plan_code in ('individual_trial', 'individual') then
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
