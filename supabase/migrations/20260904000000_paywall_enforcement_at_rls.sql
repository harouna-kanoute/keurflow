-- Closes a real paywall-bypass gap found by a security audit: create_project()
-- (a SECURITY DEFINER RPC) has always checked trial/subscription status
-- before inserting, but every other row that should be gated the same way —
-- expenses, fundings, milestones, photos, documents, reports, and project
-- invites — was only blocked by application code (the Next.js Server Action
-- layer, via isOrganizationBlocked()). The mobile app never enforced this at
-- all (no server layer to do it in), and even on web a direct REST call to
-- Supabase (any authenticated session already holds a valid anon-key JWT)
-- bypassed the Next.js check entirely. RLS is the only layer that can't be
-- bypassed by the client, so the check moves here.
--
-- Scope is deliberately INSERT-only, mirroring create_project(): a blocked
-- org can't create new billable content, but can still update/delete/approve
-- what already exists (e.g. finish reviewing an expense, mark a milestone
-- complete) — consistent with "you can't consume more, you can still manage
-- what you already have," and avoids surprising an org mid-review the moment
-- their trial lapses.
create function public.is_organization_billing_active(target_organization_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    not (
      s.plan_code in ('individual_trial', 'individual', 'individual_unlimited', 'agency_starter', 'agency_business')
      and (
        (s.status = 'trialing' and s.trial_ends_at < now())
        or s.status in ('past_due', 'canceled', 'incomplete')
      )
    ),
    true -- no subscription row at all: fail open, same as create_project()'s
         -- existing behavior (a NULL plan_code never matches the `in (...)` list)
  )
  from public.subscriptions s
  where s.organization_id = target_organization_id;
$$;

-- expenses
drop policy "expenses_insert_non_viewers" on public.expenses;
create policy "expenses_insert_non_viewers"
  on public.expenses for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and public.is_organization_billing_active(public.get_project_organization_id(project_id))
    and (
      public.get_organization_role(public.get_project_organization_id(project_id))
        in ('owner', 'admin', 'manager', 'member')
      or public.get_project_role(project_id)
        in ('project_owner', 'project_manager', 'project_member')
    )
  );

-- fundings
drop policy "fundings_insert_non_viewers" on public.fundings;
create policy "fundings_insert_non_viewers"
  on public.fundings for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and public.is_organization_billing_active(public.get_project_organization_id(project_id))
    and (
      public.get_organization_role(public.get_project_organization_id(project_id))
        in ('owner', 'admin', 'manager', 'member')
      or public.get_project_role(project_id)
        in ('project_owner', 'project_manager', 'project_member')
    )
  );

-- photos
drop policy "photos_insert_non_viewers" on public.photos;
create policy "photos_insert_non_viewers"
  on public.photos for insert
  to authenticated
  with check (
    uploaded_by = auth.uid()
    and public.is_organization_billing_active(public.get_project_organization_id(project_id))
    and (
      public.get_organization_role(public.get_project_organization_id(project_id))
        in ('owner', 'admin', 'manager', 'member')
      or public.get_project_role(project_id)
        in ('project_owner', 'project_manager', 'project_member')
    )
  );

-- documents
drop policy "documents_insert_non_viewers" on public.documents;
create policy "documents_insert_non_viewers"
  on public.documents for insert
  to authenticated
  with check (
    uploaded_by = auth.uid()
    and public.is_organization_billing_active(public.get_project_organization_id(project_id))
    and (
      public.get_organization_role(public.get_project_organization_id(project_id))
        in ('owner', 'admin', 'manager', 'member')
      or public.get_project_role(project_id)
        in ('project_owner', 'project_manager', 'project_member')
    )
  );

-- reports — role list includes project_approver per 20260819000000_project_approver_role.sql
drop policy "reports_insert_non_viewers" on public.reports;
create policy "reports_insert_non_viewers"
  on public.reports for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and public.is_organization_billing_active(public.get_project_organization_id(project_id))
    and (
      public.get_organization_role(public.get_project_organization_id(project_id))
        in ('owner', 'admin', 'manager', 'member')
      or public.get_project_role(project_id)
        in ('project_owner', 'project_manager', 'project_member', 'project_approver')
    )
  );

-- milestones: was a single "for all" policy: split into insert (billing-gated)
-- vs update/delete (unchanged behavior — still open to the same non-viewer
-- roles, so e.g. marking a milestone complete keeps working after a trial lapses).
drop policy "milestones_write_non_viewers" on public.milestones;

create policy "milestones_insert_non_viewers"
  on public.milestones for insert
  to authenticated
  with check (
    public.is_organization_billing_active(public.get_project_organization_id(project_id))
    and (
      public.get_organization_role(public.get_project_organization_id(project_id))
        in ('owner', 'admin', 'manager', 'member')
      or public.get_project_role(project_id)
        in ('project_owner', 'project_manager', 'project_member')
    )
  );

create policy "milestones_update_non_viewers"
  on public.milestones for update
  to authenticated
  using (
    public.get_organization_role(public.get_project_organization_id(project_id))
      in ('owner', 'admin', 'manager', 'member')
    or public.get_project_role(project_id)
      in ('project_owner', 'project_manager', 'project_member')
  )
  with check (
    public.get_organization_role(public.get_project_organization_id(project_id))
      in ('owner', 'admin', 'manager', 'member')
    or public.get_project_role(project_id)
      in ('project_owner', 'project_manager', 'project_member')
  );

create policy "milestones_delete_non_viewers"
  on public.milestones for delete
  to authenticated
  using (
    public.get_organization_role(public.get_project_organization_id(project_id))
      in ('owner', 'admin', 'manager', 'member')
    or public.get_project_role(project_id)
      in ('project_owner', 'project_manager', 'project_member')
  );

-- project_members (invites): was a single "for all" policy: split the same way
-- — inviting a new collaborator is billing-gated, managing/removing an
-- existing one is not.
drop policy "project_members_manage" on public.project_members;

create policy "project_members_insert_managers"
  on public.project_members for insert
  to authenticated
  with check (
    public.is_organization_billing_active(public.get_project_organization_id(project_id))
    and (
      public.get_project_role(project_id) in ('project_owner', 'project_manager')
      or public.get_organization_role(public.get_project_organization_id(project_id)) in ('owner', 'admin', 'manager')
    )
  );

create policy "project_members_update_managers"
  on public.project_members for update
  to authenticated
  using (
    public.get_project_role(project_id) in ('project_owner', 'project_manager')
    or public.get_organization_role(public.get_project_organization_id(project_id)) in ('owner', 'admin', 'manager')
  )
  with check (
    public.get_project_role(project_id) in ('project_owner', 'project_manager')
    or public.get_organization_role(public.get_project_organization_id(project_id)) in ('owner', 'admin', 'manager')
  );

create policy "project_members_delete_managers"
  on public.project_members for delete
  to authenticated
  using (
    public.get_project_role(project_id) in ('project_owner', 'project_manager')
    or public.get_organization_role(public.get_project_organization_id(project_id)) in ('owner', 'admin', 'manager')
  );
