-- An org owner/admin can now edit the organization's own name/address/
-- phone/email — see updateOrganization() in apps/web/src/app/dashboard/actions.ts.
-- No new RLS policy needed: organizations_update_admins (from
-- 20260811140000_organizations.sql) already covers this update — just a
-- new audit action to record it.
alter table public.audit_logs drop constraint audit_logs_action_check;
alter table public.audit_logs add constraint audit_logs_action_check check (
  action in (
    'project_created', 'project_updated', 'project_deleted', 'member_invited', 'member_updated',
    'member_removed', 'expense_created', 'expense_updated', 'expense_approved', 'expense_rejected',
    'document_uploaded', 'photo_uploaded', 'photo_deleted', 'funding_created', 'milestone_updated',
    'comment_created', 'report_created', 'organization_updated'
  )
);
