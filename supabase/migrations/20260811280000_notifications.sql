-- Notifications (spec §51) — in-app channel only for now; email/push are
-- listed as future channels in the spec but need real delivery
-- infrastructure (transactional email templates, push tokens) that doesn't
-- exist yet, so this table only ever represents in-app entries.
--
-- Deliberately no INSERT policy for `authenticated`: creating a notification
-- means writing to *someone else's* row (the recipient), which is
-- fundamentally not something RLS should let an arbitrary project member do
-- directly — it's only ever done server-side via the service role client
-- (apps/web/src/lib/notifications.ts), after the triggering action's own
-- authorization has already been checked. A user can only read and mark
-- their own notifications read.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  type text not null check (
    type in (
      'new_expense', 'expense_needs_review', 'document_added',
      'expense_approved', 'expense_rejected', 'milestone_completed',
      'milestone_delayed', 'report_created', 'member_invited'
    )
  ),
  title text not null check (char_length(title) <= 200),
  body text check (char_length(body) <= 500),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create index notifications_user_id_created_at_idx
  on public.notifications (user_id, created_at desc);

create policy "notifications_select_own"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

create policy "notifications_update_own"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
