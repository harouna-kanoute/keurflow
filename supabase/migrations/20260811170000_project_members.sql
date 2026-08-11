-- project_members (spec §23) + the RLS for both projects and project_members,
-- since both depend on helpers that need both tables to already exist.
--
-- Visibility model: a project is visible to organization staff (oversight
-- across every project in the tenant) OR to its own project_members —
-- collaborators such as a client's family member or on-site foreman, who
-- are project-scoped participants and not necessarily organization members
-- at all (spec §7, §13). Organization roles and project roles stay separate
-- (spec §15): an org "member"/"viewer" still sees the project, but editing
-- rights are governed independently by each role hierarchy.
create table public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null
    check (role in ('project_owner', 'project_manager', 'project_member', 'project_viewer')),
  status text not null default 'active' check (status in ('invited', 'active', 'suspended', 'removed')),
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);

alter table public.project_members enable row level security;

-- STABLE + SECURITY DEFINER: fetches a project's organization_id bypassing
-- RLS, so policies below can check organization membership for a given
-- project without querying the (RLS-protected) projects table directly.
create function public.get_project_organization_id(target_project_id uuid)
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select organization_id from public.projects where id = target_project_id;
$$;

create function public.is_project_member(target_project_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.project_members
    where project_id = target_project_id
      and user_id = auth.uid()
      and status = 'active'
  );
$$;

create function public.get_project_role(target_project_id uuid)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role
  from public.project_members
  where project_id = target_project_id
    and user_id = auth.uid()
    and status = 'active'
  limit 1;
$$;

create policy "projects_select_org_or_project_members"
  on public.projects for select
  to authenticated
  using (
    public.is_organization_member(organization_id)
    or public.is_project_member(id)
  );

create policy "projects_update_org_managers_or_project_owners"
  on public.projects for update
  to authenticated
  using (
    public.get_organization_role(organization_id) in ('owner', 'admin', 'manager')
    or public.get_project_role(id) in ('project_owner', 'project_manager')
  )
  with check (
    public.get_organization_role(organization_id) in ('owner', 'admin', 'manager')
    or public.get_project_role(id) in ('project_owner', 'project_manager')
  );

-- No INSERT policy on projects: creation goes through create_project() below,
-- same reason as create_organization() — the creator's project_owner
-- membership row must exist atomically with the project itself.

create policy "project_members_select_related"
  on public.project_members for select
  to authenticated
  using (
    public.is_project_member(project_id)
    or public.is_organization_member(public.get_project_organization_id(project_id))
  );

create policy "project_members_manage"
  on public.project_members for all
  to authenticated
  using (
    public.get_project_role(project_id) in ('project_owner', 'project_manager')
    or public.get_organization_role(public.get_project_organization_id(project_id)) in ('owner', 'admin', 'manager')
  )
  with check (
    public.get_project_role(project_id) in ('project_owner', 'project_manager')
    or public.get_organization_role(public.get_project_organization_id(project_id)) in ('owner', 'admin', 'manager')
  );

create function public.create_project(
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

  return new_project;
end;
$$;

grant execute on function public.create_project(uuid, text, text, text, uuid, text, bigint, text)
  to authenticated;
