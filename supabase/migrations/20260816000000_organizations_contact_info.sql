-- Lets an organization display and edit its own contact details. There was
-- previously no way to set these, and no UI to edit the organization at all
-- — the update RLS policy (organizations_update_admins) already existed
-- from the original table, it just had nothing pointed at it.
alter table public.organizations
  add column address text,
  add column phone text,
  add column email text;
