-- Milestones (spec §38). Visibility mirrors projects; write access is open
-- to non-viewer roles like expenses/fundings — updating a milestone's
-- status is meant to be a quick action from the field (§43), not a
-- managers-only operation.
create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text check (char_length(description) <= 1000),
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'completed', 'delayed')),
  order_index integer not null default 0,
  planned_date date,
  completed_date date,
  budget_minor bigint check (budget_minor >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.milestones enable row level security;

create trigger milestones_set_updated_at
  before update on public.milestones
  for each row execute function public.set_updated_at();

-- Closes the gap left open in the Phase 8 expenses migration — milestone_id
-- existed as a plain uuid column with no FK because this table didn't exist yet.
alter table public.expenses
  add constraint expenses_milestone_id_fkey
  foreign key (milestone_id) references public.milestones (id);

create policy "milestones_select_org_or_project_members"
  on public.milestones for select
  to authenticated
  using (
    public.is_organization_member(public.get_project_organization_id(project_id))
    or public.is_project_member(project_id)
  );

create policy "milestones_write_non_viewers"
  on public.milestones for all
  to authenticated
  using (
    public.get_organization_role(public.get_project_organization_id(project_id))
      in ('owner', 'admin', 'manager', 'member')
    or public.get_project_role(project_id)
      in ('project_owner', 'project_manager', 'project_member')
  )
  with check (
    public.get_organization_role(public.get_project_organization_id(project_id))
      in ('owner', 'admin', 'manager', 'member')
    or public.get_project_role(project_id)
      in ('project_owner', 'project_manager', 'project_member')
  );

-- Extends create_project() (from 20260811170000_project_members.sql) to seed
-- the default milestone template — mirrors
-- packages/config/src/defaultMilestones.ts, kept in sync manually — so a new
-- project starts with a usable timeline instead of an empty one (§38).
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
  milestone_name text;
  milestone_index integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if public.get_organization_role(p_organization_id) not in ('owner', 'admin', 'manager') then
    raise exception 'Insufficient organization role';
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
