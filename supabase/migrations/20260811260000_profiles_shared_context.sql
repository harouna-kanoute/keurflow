-- Extends profiles visibility (originally self-only, from the Phase 2
-- profiles migration) to also allow seeing the profile of anyone you share
-- an active organization or project membership with — needed so a member
-- roster or an invite list can show names instead of raw user ids. Phone
-- stays effectively private in practice: nothing in the app selects it for
-- another user, only full_name/avatar_url are ever rendered this way.
--
-- This is a second permissive policy alongside profiles_select_own (from
-- 20260811100000_profiles.sql) — Postgres RLS OR's permissive policies
-- together, so self-access remains guaranteed even for someone with no
-- shared memberships at all.
create policy "profiles_select_shared_context"
  on public.profiles for select
  to authenticated
  using (
    exists (
      select 1
      from public.organization_members om1
      join public.organization_members om2 on om1.organization_id = om2.organization_id
      where om1.user_id = auth.uid()
        and om2.user_id = profiles.id
        and om1.status = 'active'
        and om2.status = 'active'
    )
    or exists (
      select 1
      from public.project_members pm1
      join public.project_members pm2 on pm1.project_id = pm2.project_id
      where pm1.user_id = auth.uid()
        and pm2.user_id = profiles.id
        and pm1.status = 'active'
        and pm2.status = 'active'
    )
  );
