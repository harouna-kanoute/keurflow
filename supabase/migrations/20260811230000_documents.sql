-- Documents / justificatifs (spec §31, §40). A document can stand alone at
-- the project level, or attach to a specific expense or funding — hence the
-- two nullable FKs rather than three separate per-entity tables.
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  uploaded_by uuid not null default auth.uid() references auth.users (id),
  document_type text not null
    check (document_type in ('invoice', 'receipt', 'payment_proof', 'screenshot', 'identity', 'contract', 'other')),
  storage_path text not null,
  filename text not null check (char_length(filename) between 1 and 255),
  mime_type text not null,
  size bigint not null check (size > 0),
  expense_id uuid references public.expenses (id) on delete cascade,
  funding_id uuid references public.fundings (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.documents enable row level security;

create policy "documents_select_org_or_project_members"
  on public.documents for select
  to authenticated
  using (
    public.is_organization_member(public.get_project_organization_id(project_id))
    or public.is_project_member(project_id)
  );

create policy "documents_insert_non_viewers"
  on public.documents for insert
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

create policy "documents_delete_own_or_managers"
  on public.documents for delete
  to authenticated
  using (
    uploaded_by = auth.uid()
    or public.get_organization_role(public.get_project_organization_id(project_id)) in ('owner', 'admin', 'manager')
    or public.get_project_role(project_id) in ('project_owner', 'project_manager')
  );

-- Private bucket for justificatifs (spec §31, §53, §65). Path convention
-- "{project_id}/{filename}", same visibility as the table above.
insert into storage.buckets (id, name, public)
values ('expense-receipts', 'expense-receipts', false)
on conflict (id) do nothing;

create policy "expense_receipts_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'expense-receipts'
    and (
      public.is_project_member(((storage.foldername(name))[1])::uuid)
      or public.is_organization_member(
        public.get_project_organization_id(((storage.foldername(name))[1])::uuid)
      )
    )
  );

create policy "expense_receipts_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'expense-receipts'
    and (
      public.is_project_member(((storage.foldername(name))[1])::uuid)
      or public.is_organization_member(
        public.get_project_organization_id(((storage.foldername(name))[1])::uuid)
      )
    )
  );

create policy "expense_receipts_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'expense-receipts'
    and (
      public.get_project_role(((storage.foldername(name))[1])::uuid)
        in ('project_owner', 'project_manager')
      or public.get_organization_role(
        public.get_project_organization_id(((storage.foldername(name))[1])::uuid)
      ) in ('owner', 'admin', 'manager')
    )
  );
