-- Editing a project (name/type/budget/address/surface_area) from the
-- dashboard list (user request) needs no new RLS policy — the existing
-- "projects_update_org_managers_or_project_owners" policy (from
-- 20260811170000_project_members.sql) already covers it — just a new
-- audit action to record it.
alter table public.audit_logs drop constraint audit_logs_action_check;
alter table public.audit_logs add constraint audit_logs_action_check check (
  action in (
    'project_created', 'project_updated', 'project_deleted', 'member_invited', 'expense_created', 'expense_updated',
    'expense_approved', 'expense_rejected', 'document_uploaded', 'photo_uploaded',
    'funding_created', 'milestone_updated', 'comment_created', 'report_created'
  )
);
