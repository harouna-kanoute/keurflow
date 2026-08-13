-- Support tickets (user request: a way to report bugs, security issues, or
-- any other problem from the dashboard). Deliberately no staff/admin role
-- exists yet in this app, so there's no in-app triage UI — status changes
-- happen directly in Supabase Studio for now. A user can create a ticket
-- and see their own submission history, nothing more.
create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  organization_id uuid references public.organizations (id) on delete set null,
  category text not null check (category in ('bug', 'security', 'other')),
  subject text not null check (char_length(subject) between 3 and 150),
  description text not null check (char_length(description) between 10 and 4000),
  -- Auto-captured from the page the user was on when they reported the
  -- issue — useful reproduction context, never user-typed.
  page_url text check (char_length(page_url) <= 300),
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'resolved', 'closed')),
  created_at timestamptz not null default now()
);

alter table public.support_tickets enable row level security;
alter table public.support_tickets force row level security;

create index support_tickets_user_id_created_at_idx
  on public.support_tickets (user_id, created_at desc);

create policy "support_tickets_insert_own"
  on public.support_tickets for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "support_tickets_select_own"
  on public.support_tickets for select
  to authenticated
  using (user_id = auth.uid());

-- No update/delete policy for `authenticated`: once submitted, a ticket is
-- immutable from the client — status changes are triage, not self-service.
