-- Project deletion (user request). Hard delete — every table referencing
-- projects.id already uses "on delete cascade" (project_members, fundings,
-- expenses, documents, milestones, photos, reports, notifications; see
-- their respective migrations), except audit_logs which uses
-- "on delete set null" so the audit trail survives the project it
-- references. No new cascade wiring needed, just the RLS policy allowing
-- the delete itself, and a new audit action to record it.

-- Deliberately a higher bar than the existing update policy (which also
-- allows org managers / project managers): deletion is irreversible and
-- destroys every expense, funding, document and photo under the project,
-- so it's restricted to org owners/admins or the project's own owner.
create policy "projects_delete_org_admins_or_project_owners"
  on public.projects for delete
  to authenticated
  using (
    public.get_organization_role(organization_id) in ('owner', 'admin')
    or public.get_project_role(id) = 'project_owner'
  );

alter table public.audit_logs drop constraint audit_logs_action_check;
alter table public.audit_logs add constraint audit_logs_action_check check (
  action in (
    'project_created', 'project_deleted', 'member_invited', 'expense_created', 'expense_updated',
    'expense_approved', 'expense_rejected', 'document_uploaded', 'photo_uploaded',
    'funding_created', 'milestone_updated', 'comment_created', 'report_created'
  )
);
