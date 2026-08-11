-- Private Storage buckets (spec §53, §65). expense-receipts and
-- funding-proofs are deferred to the migrations that create expenses/
-- fundings (Phase 7/8) — their RLS would otherwise reference tables that
-- don't exist yet. All buckets here are private: files are only ever
-- reachable through short-lived signed URLs the app generates after its
-- own RLS-backed query confirms the caller may see the owning row.
insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', false),
  ('project-photos', 'project-photos', false),
  ('project-documents', 'project-documents', false)
on conflict (id) do nothing;

-- avatars: path convention "{user_id}/{filename}" — a user manages only
-- their own folder. Read access mirrors profiles_select_own (self only);
-- avatars aren't shared across an organization/project the way project
-- photos are.
create policy "avatars_select_own"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_insert_own"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_update_own"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_delete_own"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- project-photos / project-documents: path convention "{project_id}/{filename}".
-- Visibility mirrors the projects table policy exactly (org member OR
-- project member) so a file is never reachable by someone who couldn't
-- already see the project it belongs to.
create policy "project_photos_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'project-photos'
    and (
      public.is_project_member(((storage.foldername(name))[1])::uuid)
      or public.is_organization_member(
        public.get_project_organization_id(((storage.foldername(name))[1])::uuid)
      )
    )
  );

create policy "project_photos_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'project-photos'
    and (
      public.is_project_member(((storage.foldername(name))[1])::uuid)
      or public.is_organization_member(
        public.get_project_organization_id(((storage.foldername(name))[1])::uuid)
      )
    )
  );

create policy "project_photos_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'project-photos'
    and (
      public.get_project_role(((storage.foldername(name))[1])::uuid)
        in ('project_owner', 'project_manager')
      or public.get_organization_role(
        public.get_project_organization_id(((storage.foldername(name))[1])::uuid)
      ) in ('owner', 'admin', 'manager')
    )
  );

create policy "project_documents_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'project-documents'
    and (
      public.is_project_member(((storage.foldername(name))[1])::uuid)
      or public.is_organization_member(
        public.get_project_organization_id(((storage.foldername(name))[1])::uuid)
      )
    )
  );

create policy "project_documents_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'project-documents'
    and (
      public.is_project_member(((storage.foldername(name))[1])::uuid)
      or public.is_organization_member(
        public.get_project_organization_id(((storage.foldername(name))[1])::uuid)
      )
    )
  );

create policy "project_documents_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'project-documents'
    and (
      public.get_project_role(((storage.foldername(name))[1])::uuid)
        in ('project_owner', 'project_manager')
      or public.get_organization_role(
        public.get_project_organization_id(((storage.foldername(name))[1])::uuid)
      ) in ('owner', 'admin', 'manager')
    )
  );
