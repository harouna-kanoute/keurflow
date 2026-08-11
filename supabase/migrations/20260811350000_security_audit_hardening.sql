-- Phase 16 security audit — defense-in-depth hardening (no functional
-- behavior change; every table already had a correct, tested RLS policy
-- set, and `phone` was never read or written anywhere in the app).

-- FORCE ROW LEVEL SECURITY, per SECURITY.md: without it, a table's OWNER
-- role bypasses RLS entirely. The app never queries as the owner (it always
-- uses anon/authenticated via PostgREST), so this doesn't change current
-- behavior — it closes the gap for good, in case that ever changes (a
-- migration run as a privileged role, a future direct-DB integration, etc).
alter table public.profiles force row level security;
alter table public.currencies force row level security;
alter table public.countries force row level security;
alter table public.organizations force row level security;
alter table public.organization_members force row level security;
alter table public.projects force row level security;
alter table public.project_members force row level security;
alter table public.payment_methods force row level security;
alter table public.fundings force row level security;
alter table public.expenses force row level security;
alter table public.expense_items force row level security;
alter table public.documents force row level security;
alter table public.milestones force row level security;
alter table public.photos force row level security;
alter table public.reports force row level security;
alter table public.notifications force row level security;
alter table public.plans force row level security;
alter table public.subscriptions force row level security;

-- profiles.phone: a real column, but never selected or written anywhere in
-- apps/web or apps/mobile. RLS is row-level, not column-level — the
-- "profiles_select_shared_context" policy (20260811260000) grants any
-- shared org/project member SELECT on the whole row, so this column was
-- readable by anyone sharing a workspace via a direct REST call, even
-- though the UI never surfaces it. Since nothing uses it, the simplest fix
-- is to remove it rather than carry an unused PII field forward — if phone
-- collection becomes a real feature, it belongs in a self-only-visible
-- table instead.
alter table public.profiles drop column phone;
