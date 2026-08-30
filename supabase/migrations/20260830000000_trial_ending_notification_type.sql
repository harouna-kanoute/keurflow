-- New notification type for the trial-ending-soon reminder (sent 2 days
-- before trial_ends_at by the /api/cron/trial-reminders Vercel Cron job).
-- Org-level, not tied to a project — notifications.project_id is already
-- nullable, so no schema change needed there.
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (
  type in (
    'new_expense', 'expense_needs_review', 'document_added',
    'expense_approved', 'expense_rejected', 'milestone_completed',
    'milestone_delayed', 'report_created', 'member_invited', 'trial_ending_soon'
  )
);
