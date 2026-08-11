-- Expense comments (spec §8, §34, §42) — a lightweight discussion thread on
-- a single expense, so a question like "quel est ce reçu ?" doesn't have to
-- happen over WhatsApp outside the app. Comments are permanent once posted
-- (no update/delete policy) — same reasoning as reports: an edit/delete
-- history for something meant to build trust between a remote financer and
-- whoever is on-site would undermine the trust it's meant to build.
create table public.expense_comments (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id),
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now()
);

alter table public.expense_comments enable row level security;
alter table public.expense_comments force row level security;

create index expense_comments_expense_id_idx on public.expense_comments (expense_id);

create policy "expense_comments_select_related"
  on public.expense_comments for select
  to authenticated
  using (
    public.is_organization_member(
      public.get_project_organization_id(public.get_expense_project_id(expense_id))
    )
    or public.is_project_member(public.get_expense_project_id(expense_id))
  );

-- Same "non-viewer" bar as expense_items/milestones: any real collaborator
-- can comment, not just managers — a comment is a question or a status
-- update from the field, not a privileged action.
create policy "expense_comments_insert_non_viewers"
  on public.expense_comments for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and (
      public.get_organization_role(
        public.get_project_organization_id(public.get_expense_project_id(expense_id))
      ) in ('owner', 'admin', 'manager', 'member')
      or public.get_project_role(public.get_expense_project_id(expense_id))
        in ('project_owner', 'project_manager', 'project_member')
    )
  );
