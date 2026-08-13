-- Nothing ever flipped a project_members row from 'invited' to 'active'
-- after the invited person actually confirmed their account (user report:
-- confirmed the invite, landed on /dashboard, no access to the chantier).
-- RLS (is_project_member) requires status = 'active', so an invite that's
-- accepted but never activated is invisible forever.
--
-- A plain RLS UPDATE policy here would be unsafe: USING/WITH CHECK can only
-- constrain which rows qualify and what the resulting row's status/user_id
-- are, not which *columns* the caller is allowed to touch in the same
-- statement — a self-service policy scoped to "my own invited row" could
-- still let the caller smuggle a role change (e.g. project_viewer ->
-- project_owner) into the same UPDATE. A SECURITY DEFINER function that
-- only ever writes status sidesteps that entirely, same as every other
-- privileged/atomic operation in this schema (create_project,
-- create_organization, ...).
create function public.accept_project_invites()
returns void
language sql
security definer
set search_path = public
as $$
  update public.project_members
  set status = 'active'
  where user_id = auth.uid()
    and status = 'invited';
$$;

grant execute on function public.accept_project_invites() to authenticated;
