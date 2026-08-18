-- Allow a ticket owner to remove one of their own attachment paths — see
-- deleteSupportAttachment() in apps/web/src/app/dashboard/support/actions.ts.
-- Tickets were deliberately immutable from the client (see
-- 20260814000000_support_tickets.sql, "status changes happen directly in
-- Supabase Studio for now"). A plain any-column update policy would undo
-- that: a client can call the Supabase REST API directly with its own
-- session regardless of what our Server Action does, so RLS + a column-level
-- grant — not the Server Action — is what actually keeps subject,
-- description, category and status immutable while allowing this one column
-- to change.
--
-- Rewritten as "drop if exists" + recreate (idempotent) after live testing
-- showed the first version of this policy silently matched zero rows on
-- UPDATE even for the ticket's own owner.
drop policy if exists "support_tickets_update_own_attachments" on public.support_tickets;
create policy "support_tickets_update_own_attachments"
  on public.support_tickets for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

revoke update on public.support_tickets from authenticated;
grant update (attachment_paths) on public.support_tickets to authenticated;

notify pgrst, 'reload schema';
