-- Lets a user attach screenshots to a support ticket (user request). Path
-- convention "{user_id}/{filename}" — same reasoning as avatars: a support
-- ticket doesn't exist yet at upload time (files are uploaded client-side
-- before the ticket row is created), so ownership is scoped to the
-- uploader, not the ticket. Private bucket, only ever reachable through
-- signed URLs the app generates after support_tickets_select_own confirms
-- the caller owns the ticket.
insert into storage.buckets (id, name, public)
values ('support-attachments', 'support-attachments', false)
on conflict (id) do nothing;

create policy "support_attachments_select_own"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'support-attachments' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "support_attachments_insert_own"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'support-attachments' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "support_attachments_delete_own"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'support-attachments' and (storage.foldername(name))[1] = auth.uid()::text);

alter table public.support_tickets add column attachment_paths text[];
