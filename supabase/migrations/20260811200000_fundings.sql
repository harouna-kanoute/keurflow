-- Fundings (spec §27) — money the diaspora sends in. Visibility mirrors
-- projects exactly (org member OR project member). Unlike organizations/
-- projects, no bootstrapping problem exists here (the creator already has a
-- membership row before logging a funding), so plain RLS is enough — no RPC.
create table public.fundings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users (id),
  amount_minor bigint not null check (amount_minor > 0),
  currency_code text not null references public.currencies (code),
  payment_method_id uuid not null references public.payment_methods (id),
  reference text check (char_length(reference) <= 120),
  description text check (char_length(description) <= 500),
  funding_date date not null,
  -- Storage object path within the private "funding-proofs" bucket
  -- ("{project_id}/{filename}"), never a public URL — the app signs a
  -- short-lived URL on read after its own RLS-backed query succeeds.
  proof_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.fundings enable row level security;

create trigger fundings_set_updated_at
  before update on public.fundings
  for each row execute function public.set_updated_at();

create policy "fundings_select_org_or_project_members"
  on public.fundings for select
  to authenticated
  using (
    public.is_organization_member(public.get_project_organization_id(project_id))
    or public.is_project_member(project_id)
  );

-- Any collaborator with a real (non-viewer) role can log a funding — this is
-- meant to be used by whoever is on the ground, not just the project owner.
create policy "fundings_insert_non_viewers"
  on public.fundings for insert
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

create policy "fundings_update_own_or_managers"
  on public.fundings for update
  to authenticated
  using (
    created_by = auth.uid()
    or public.get_organization_role(public.get_project_organization_id(project_id)) in ('owner', 'admin', 'manager')
    or public.get_project_role(project_id) in ('project_owner', 'project_manager')
  )
  with check (
    created_by = auth.uid()
    or public.get_organization_role(public.get_project_organization_id(project_id)) in ('owner', 'admin', 'manager')
    or public.get_project_role(project_id) in ('project_owner', 'project_manager')
  );

create policy "fundings_delete_managers"
  on public.fundings for delete
  to authenticated
  using (
    public.get_organization_role(public.get_project_organization_id(project_id)) in ('owner', 'admin', 'manager')
    or public.get_project_role(project_id) in ('project_owner', 'project_manager')
  );

-- Private bucket for funding proof photos/screenshots (spec §27, §53, §65).
-- Path convention "{project_id}/{filename}", same visibility as the table.
insert into storage.buckets (id, name, public)
values ('funding-proofs', 'funding-proofs', false)
on conflict (id) do nothing;

create policy "funding_proofs_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'funding-proofs'
    and (
      public.is_project_member(((storage.foldername(name))[1])::uuid)
      or public.is_organization_member(
        public.get_project_organization_id(((storage.foldername(name))[1])::uuid)
      )
    )
  );

create policy "funding_proofs_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'funding-proofs'
    and (
      public.is_project_member(((storage.foldername(name))[1])::uuid)
      or public.is_organization_member(
        public.get_project_organization_id(((storage.foldername(name))[1])::uuid)
      )
    )
  );

create policy "funding_proofs_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'funding-proofs'
    and (
      public.get_project_role(((storage.foldername(name))[1])::uuid)
        in ('project_owner', 'project_manager')
      or public.get_organization_role(
        public.get_project_organization_id(((storage.foldername(name))[1])::uuid)
      ) in ('owner', 'admin', 'manager')
    )
  );
