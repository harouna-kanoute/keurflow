-- Photos (spec §39). The private "project-photos" bucket and its RLS
-- (path convention "{project_id}/{filename}") already exist from Phase 4 —
-- this migration only adds the metadata table.
create table public.photos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  milestone_id uuid references public.milestones (id) on delete set null,
  expense_id uuid references public.expenses (id) on delete set null,
  uploaded_by uuid not null default auth.uid() references auth.users (id),
  storage_path text not null,
  caption text check (char_length(caption) <= 300),
  taken_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.photos enable row level security;

create policy "photos_select_org_or_project_members"
  on public.photos for select
  to authenticated
  using (
    public.is_organization_member(public.get_project_organization_id(project_id))
    or public.is_project_member(project_id)
  );

create policy "photos_insert_non_viewers"
  on public.photos for insert
  to authenticated
  with check (
    uploaded_by = auth.uid()
    and (
      public.get_organization_role(public.get_project_organization_id(project_id))
        in ('owner', 'admin', 'manager', 'member')
      or public.get_project_role(project_id)
        in ('project_owner', 'project_manager', 'project_member')
    )
  );

create policy "photos_delete_own_or_managers"
  on public.photos for delete
  to authenticated
  using (
    uploaded_by = auth.uid()
    or public.get_organization_role(public.get_project_organization_id(project_id)) in ('owner', 'admin', 'manager')
    or public.get_project_role(project_id) in ('project_owner', 'project_manager')
  );
