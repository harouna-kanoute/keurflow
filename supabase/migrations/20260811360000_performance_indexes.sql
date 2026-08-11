-- Phase 17 performance pass. Postgres does not automatically index foreign
-- key columns (unlike primary keys) — until now, the only index in the
-- whole schema was notifications_user_id_created_at_idx. Every RLS policy
-- on nearly every table indirectly runs is_organization_member(),
-- get_organization_role(), is_project_member() or get_project_role(),
-- each of which filters organization_members/project_members by
-- (org_id/project_id, user_id, status) — without an index, that's a full
-- table scan on every single row check, on every query, in every table.

-- Covers is_organization_member() / get_organization_role() exactly.
create index organization_members_org_user_status_idx
  on public.organization_members (organization_id, user_id, status);

-- "list members of an organization" (member roster, agency dashboard counts).
create index organization_members_organization_id_idx
  on public.organization_members (organization_id);

-- Covers is_project_member() / get_project_role() exactly.
create index project_members_project_user_status_idx
  on public.project_members (project_id, user_id, status);

-- "list members of a project" (member roster, invite checks, notification audience).
create index project_members_project_id_idx
  on public.project_members (project_id);

-- "list projects in an organization" (dashboard, agency dashboard).
create index projects_organization_id_idx
  on public.projects (organization_id);

-- Every per-project child table: "select ... where project_id = X" is the
-- single most common query shape in the app (fundings/expenses/milestones/
-- photos/documents/reports lists on the project detail page).
create index fundings_project_id_idx on public.fundings (project_id);
create index expenses_project_id_idx on public.expenses (project_id);
create index milestones_project_id_idx on public.milestones (project_id);
create index photos_project_id_idx on public.photos (project_id);
create index documents_project_id_idx on public.documents (project_id);
create index reports_project_id_idx on public.reports (project_id);

-- Backs get_expense_project_id() (used by every expense_items RLS policy)
-- and the amount-sync trigger's "sum items for this expense" query.
create index expense_items_expense_id_idx on public.expense_items (expense_id);

-- documents can also be looked up by the expense/funding they attach to
-- (project detail page shows "documentation status" per expense).
create index documents_expense_id_idx on public.documents (expense_id) where expense_id is not null;
create index documents_funding_id_idx on public.documents (funding_id) where funding_id is not null;

-- photos can attach to a milestone or expense (gallery filters).
create index photos_milestone_id_idx on public.photos (milestone_id) where milestone_id is not null;
create index photos_expense_id_idx on public.photos (expense_id) where expense_id is not null;
