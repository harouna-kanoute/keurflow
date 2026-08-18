-- New project role: "project_approver" — an agency-invited chantier owner
-- (the client, often abroad) who can approve/reject/request-info on
-- expenses and create reports, but — unlike project_manager — cannot
-- manage other project members, edit/delete the project, or manage other
-- resources. Ranked between project_member and project_manager
-- (packages/types/src/enums.ts PROJECT_ROLE_RANK) so every *other*
-- manager-gated policy (projects update, project_members manage, fundings,
-- documents/photos delete, etc.) continues to exclude it unchanged — only
-- the two policies below, which grant its actual new abilities, need to
-- list it explicitly, since RLS role checks here are membership-in-a-list,
-- not rank comparisons.
alter table public.project_members drop constraint project_members_role_check;
alter table public.project_members add constraint project_members_role_check
  check (role in ('project_owner', 'project_manager', 'project_approver', 'project_member', 'project_viewer'));

drop policy "expenses_update_own_pending_or_managers" on public.expenses;
create policy "expenses_update_own_pending_or_managers"
  on public.expenses for update
  to authenticated
  using (
    (created_by = auth.uid() and status in ('pending', 'needs_information'))
    or public.get_organization_role(public.get_project_organization_id(project_id)) in ('owner', 'admin', 'manager')
    or public.get_project_role(project_id) in ('project_owner', 'project_manager', 'project_approver')
  )
  with check (
    (created_by = auth.uid() and status in ('pending', 'needs_information'))
    or public.get_organization_role(public.get_project_organization_id(project_id)) in ('owner', 'admin', 'manager')
    or public.get_project_role(project_id) in ('project_owner', 'project_manager', 'project_approver')
  );

drop policy "reports_insert_non_viewers" on public.reports;
create policy "reports_insert_non_viewers"
  on public.reports for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and (
      public.get_organization_role(public.get_project_organization_id(project_id))
        in ('owner', 'admin', 'manager', 'member')
      or public.get_project_role(project_id)
        in ('project_owner', 'project_manager', 'project_member', 'project_approver')
    )
  );
