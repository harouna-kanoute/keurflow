-- Reports (spec §41) — a point-in-time text snapshot of a project (progress,
-- funding/spend for the period, documents, items to review), generated
-- server-side from real data at creation time. Visibility mirrors
-- projects/fundings/expenses exactly. No update policy: a report is an
-- immutable snapshot, not a living document — regenerate a new one instead
-- of editing an old one.
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users (id),
  period_start date not null,
  period_end date not null,
  summary text not null,
  created_at timestamptz not null default now(),
  check (period_end >= period_start)
);

alter table public.reports enable row level security;

create policy "reports_select_org_or_project_members"
  on public.reports for select
  to authenticated
  using (
    public.is_organization_member(public.get_project_organization_id(project_id))
    or public.is_project_member(project_id)
  );

create policy "reports_insert_non_viewers"
  on public.reports for insert
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

create policy "reports_delete_own_or_managers"
  on public.reports for delete
  to authenticated
  using (
    created_by = auth.uid()
    or public.get_organization_role(public.get_project_organization_id(project_id)) in ('owner', 'admin', 'manager')
    or public.get_project_role(project_id) in ('project_owner', 'project_manager')
  );
