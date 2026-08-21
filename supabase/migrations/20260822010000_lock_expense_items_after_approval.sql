-- SECURITY FIX (high): expenses locks non-manager edits once its status
-- leaves pending/needs_information (expenses_update_own_pending_or_managers,
-- 20260811210000_expenses.sql — "the actual authority" for the approval
-- workflow, per that migration's own comment). But expense_items — the line
-- items whose sum sync_expense_amount_from_items() writes back into
-- expenses.amount_minor — only ever checked org/project role, never the
-- parent expense's status. Any active non-viewer collaborator (not just the
-- original submitter) could insert/update/delete line items on an
-- already-approved expense, and the trigger would silently recompute the
-- total — bypassing the approval lock after the fact.
--
-- expense_items_select_related (unchanged) already grants read access
-- independent of status, so tightening this "for all" policy's using/with
-- check only affects insert/update/delete, mirroring
-- expenses_update_own_pending_or_managers exactly: managers/owners/admins
-- can always write, everyone else only while the parent expense is still
-- pending/needs_information.
drop policy "expense_items_write_non_viewers" on public.expense_items;

create policy "expense_items_write_non_viewers"
  on public.expense_items for all
  to authenticated
  using (
    (
      public.get_organization_role(
        public.get_project_organization_id(public.get_expense_project_id(expense_id))
      ) in ('owner', 'admin', 'manager', 'member')
      or public.get_project_role(public.get_expense_project_id(expense_id))
        in ('project_owner', 'project_manager', 'project_member')
    )
    and (
      exists (
        select 1 from public.expenses e
        where e.id = expense_id and e.status in ('pending', 'needs_information')
      )
      or public.get_organization_role(
        public.get_project_organization_id(public.get_expense_project_id(expense_id))
      ) in ('owner', 'admin', 'manager')
      or public.get_project_role(public.get_expense_project_id(expense_id))
        in ('project_owner', 'project_manager')
    )
  )
  with check (
    (
      public.get_organization_role(
        public.get_project_organization_id(public.get_expense_project_id(expense_id))
      ) in ('owner', 'admin', 'manager', 'member')
      or public.get_project_role(public.get_expense_project_id(expense_id))
        in ('project_owner', 'project_manager', 'project_member')
    )
    and (
      exists (
        select 1 from public.expenses e
        where e.id = expense_id and e.status in ('pending', 'needs_information')
      )
      or public.get_organization_role(
        public.get_project_organization_id(public.get_expense_project_id(expense_id))
      ) in ('owner', 'admin', 'manager')
      or public.get_project_role(public.get_expense_project_id(expense_id))
        in ('project_owner', 'project_manager')
    )
  );
