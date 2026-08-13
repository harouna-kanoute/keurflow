-- Editing a member's role or removing them from a chantier (user request)
-- needs no new RLS policy — "project_members_manage" (from
-- 20260811170000_project_members.sql) is `for all` and already covers
-- UPDATE/DELETE — just new audit actions to record these.
alter table public.audit_logs drop constraint audit_logs_action_check;
alter table public.audit_logs add constraint audit_logs_action_check check (
  action in (
    'project_created', 'project_updated', 'project_deleted', 'member_invited', 'member_updated',
    'member_removed', 'expense_created', 'expense_updated', 'expense_approved', 'expense_rejected',
    'document_uploaded', 'photo_uploaded', 'funding_created', 'milestone_updated', 'comment_created',
    'report_created'
  )
);
