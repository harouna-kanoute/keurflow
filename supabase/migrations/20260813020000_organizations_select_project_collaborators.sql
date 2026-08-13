-- "Chantiers où vous collaborez" (dashboard, user request) needs the
-- organization's name/type for context, but a pure project_member (a client
-- or family member invited onto a chantier, with no organization_members
-- row of their own) couldn't read organizations at all — only members of
-- that org could, per organizations_select_members (20260811140000). This
-- mirrors the same "shared context" extension already applied to profiles
-- (20260811260000_profiles_shared_context.sql): read-only visibility of an
-- org's own name/type, nothing financial or membership-related.
create function public.is_organization_project_collaborator(target_organization_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.project_members pm
    join public.projects p on p.id = pm.project_id
    where p.organization_id = target_organization_id
      and pm.user_id = auth.uid()
      and pm.status = 'active'
  );
$$;

drop policy "organizations_select_members" on public.organizations;
create policy "organizations_select_members"
  on public.organizations for select
  to authenticated
  using (
    public.is_organization_member(id)
    or public.is_organization_project_collaborator(id)
  );
