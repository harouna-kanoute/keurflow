-- Account deletion previously hard-blocked for anyone who owned an
-- organization (deleteAccount's manual pre-check in apps/web/src/app/
-- dashboard/settings/actions.ts) — which, since every individual signs up
-- with their own personal "individual" organization (handle_new_user()),
-- meant almost nobody could actually delete their account. This function
-- replaces that block with automatic ownership transfer, called by
-- deleteAccount right before admin.auth.admin.deleteUser(): without it,
-- deleting the auth.users row would fail outright on the organizations.
-- owner_id / projects.owner_id foreign keys (deliberately not ON DELETE
-- CASCADE — losing an owner must never silently vaporize a shared
-- organization's chantiers, see the projects.sql/organizations.sql comments).
--
-- Per organization owned by the caller:
--   - no other active member exists (the common case: a solo personal
--     org) -> nothing to hand off to and nobody else affected, so the
--     organization (and everything under it, via existing ON DELETE
--     CASCADE chains) is deleted outright.
--   - another active admin/manager exists -> ownership transfers to them
--     automatically.
--   - other members exist but none is admin/manager -> blocked; the
--     caller needs to promote someone first. Raised as a distinguishable
--     error so deleteAccount can turn it into a specific user-facing
--     message rather than the generic fallback.
--
-- Per project individually owned by the caller (projects.owner_id is
-- whoever called create_project(), not necessarily the org owner) whose
-- organization still exists after the step above: transfers to another
-- active project_manager, falling back to the project's organization's
-- (possibly just-transferred) owner if none exists.
create function public.prepare_account_deletion()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user uuid := auth.uid();
  org record;
  proj record;
  new_owner uuid;
  other_members_count int;
begin
  if target_user is null then
    raise exception 'Authentication required';
  end if;

  for org in select id, name from public.organizations where owner_id = target_user loop
    select count(*) into other_members_count
    from public.organization_members
    where organization_id = org.id and user_id != target_user and status = 'active';

    if other_members_count = 0 then
      delete from public.organizations where id = org.id;
    else
      new_owner := null;
      select user_id into new_owner
      from public.organization_members
      where organization_id = org.id
        and user_id != target_user
        and status = 'active'
        and role in ('admin', 'manager')
      order by case role when 'admin' then 0 else 1 end
      limit 1;

      if new_owner is null then
        raise exception 'ORG_TRANSFER_BLOCKED:%', org.name;
      end if;

      update public.organizations set owner_id = new_owner where id = org.id;
      update public.organization_members set role = 'owner'
        where organization_id = org.id and user_id = new_owner;
    end if;
  end loop;

  for proj in
    select p.id, p.name, p.organization_id
    from public.projects p
    where p.owner_id = target_user
  loop
    new_owner := null;
    select user_id into new_owner
    from public.project_members
    where project_id = proj.id
      and user_id != target_user
      and status = 'active'
      and role = 'project_manager'
    limit 1;

    if new_owner is null then
      select owner_id into new_owner from public.organizations where id = proj.organization_id;
    end if;

    if new_owner is null then
      raise exception 'PROJECT_TRANSFER_BLOCKED:%', proj.name;
    end if;

    update public.projects set owner_id = new_owner where id = proj.id;

    insert into public.project_members (project_id, user_id, role, status)
    values (proj.id, new_owner, 'project_owner', 'active')
    on conflict (project_id, user_id) do update set role = 'project_owner', status = 'active';
  end loop;
end;
$$;

grant execute on function public.prepare_account_deletion() to authenticated;
