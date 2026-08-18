-- A user can now remove an expense receipt/document they (or, if a
-- manager, someone else) uploaded — see deleteDocument() in
-- apps/web/src/app/dashboard/projects/[id]/actions.ts. No new RLS policy
-- needed: documents_delete_own_or_managers (from 20260811230000_documents.sql)
-- already covers this delete — just a new audit action to record it.
alter table public.audit_logs drop constraint audit_logs_action_check;
alter table public.audit_logs add constraint audit_logs_action_check check (
  action in (
    'project_created', 'project_updated', 'project_deleted', 'member_invited', 'member_updated',
    'member_removed', 'expense_created', 'expense_updated', 'expense_approved', 'expense_rejected',
    'document_uploaded', 'photo_uploaded', 'photo_deleted', 'funding_created', 'milestone_updated',
    'comment_created', 'report_created', 'organization_updated', 'document_deleted'
  )
);
