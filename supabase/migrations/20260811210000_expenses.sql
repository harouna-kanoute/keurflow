-- Expenses (spec §28, §33). Visibility mirrors projects/fundings exactly.
-- milestone_id is nullable with no FK yet — the milestones table doesn't
-- exist until a later migration; the FK constraint is added then.
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users (id),
  amount_minor bigint not null check (amount_minor > 0),
  currency_code text not null references public.currencies (code),
  category text not null check (char_length(category) between 1 and 60),
  description text check (char_length(description) <= 500),
  supplier_name text check (char_length(supplier_name) <= 160),
  expense_date date not null,
  milestone_id uuid,
  status text not null default 'pending'
    check (status in ('pending', 'needs_information', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.expenses enable row level security;

create trigger expenses_set_updated_at
  before update on public.expenses
  for each row execute function public.set_updated_at();

create policy "expenses_select_org_or_project_members"
  on public.expenses for select
  to authenticated
  using (
    public.is_organization_member(public.get_project_organization_id(project_id))
    or public.is_project_member(project_id)
  );

-- Same "any real collaborator can document a spend" rule as fundings (§43,
-- §105 — documenting an expense should take under a minute for anyone on
-- the ground, not just the project owner).
create policy "expenses_insert_non_viewers"
  on public.expenses for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and (
      public.get_organization_role(public.get_project_organization_id(project_id))
        in ('owner', 'admin', 'manager', 'member')
      or public.get_project_role(project_id)
        in ('project_owner', 'project_manager', 'project_member')
    )
  );

-- The creator can still edit their own entry while it's under review
-- (pending/needs_information) — once approved or rejected, only a manager
-- can change it (e.g. to approve/reject, or correct a mistake after the
-- fact). Approval itself is just an UPDATE of `status`, gated the same way;
-- packages/business/permissions.ts#canApproveExpense mirrors this rule for
-- the UI, but this policy is the actual authority (§69/§83).
create policy "expenses_update_own_pending_or_managers"
  on public.expenses for update
  to authenticated
  using (
    (created_by = auth.uid() and status in ('pending', 'needs_information'))
    or public.get_organization_role(public.get_project_organization_id(project_id)) in ('owner', 'admin', 'manager')
    or public.get_project_role(project_id) in ('project_owner', 'project_manager')
  )
  with check (
    (created_by = auth.uid() and status in ('pending', 'needs_information'))
    or public.get_organization_role(public.get_project_organization_id(project_id)) in ('owner', 'admin', 'manager')
    or public.get_project_role(project_id) in ('project_owner', 'project_manager')
  );

create policy "expenses_delete_own_pending_or_managers"
  on public.expenses for delete
  to authenticated
  using (
    (created_by = auth.uid() and status in ('pending', 'needs_information'))
    or public.get_organization_role(public.get_project_organization_id(project_id)) in ('owner', 'admin', 'manager')
    or public.get_project_role(project_id) in ('project_owner', 'project_manager')
  );
