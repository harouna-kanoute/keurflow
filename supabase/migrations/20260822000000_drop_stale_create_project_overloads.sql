-- SECURITY FIX (critical): create_project() has accumulated three overloads
-- across its history (8, 10, and 12 parameters) because CREATE OR REPLACE
-- FUNCTION with a *different* signature creates a new overload instead of
-- replacing the prior one. Only the current 12-parameter version
-- (20260813040000_project_dates.sql) has the coalesce() fix for the
-- NULL-role bypass documented in 20260811340000_project_limits_milestones_fix.sql
-- ("an authenticated user with no relationship whatsoever to another
-- tenant's organization... `not in (...)` on a NULL role evaluates to NULL,
-- which IF treats as false, silently skipping the exception").
--
-- The 8-parameter overload was re-declared by 20260819040000_agency_billing_paywall.sql
-- using the *original*, pre-coalesce function body — reintroducing that
-- exact bug — and is still GRANT EXECUTE'd to `authenticated`, directly
-- callable via POST /rest/v1/rpc/create_project with the old 8-key JSON
-- body, bypassing the app UI entirely. The 10-parameter overload (from
-- 20260812130000_project_address_surface_area.sql) was superseded by the
-- 12-parameter version but never dropped either.
--
-- Only the 12-parameter overload is ever called by the app (confirmed
-- against the live PostgREST OpenAPI schema, which lists exactly those 12
-- keys). Dropping the other two removes the exploitable surface without
-- touching the function the app actually uses.
drop function if exists public.create_project(
  uuid, text, text, text, uuid, text, bigint, text
);

drop function if exists public.create_project(
  uuid, text, text, text, uuid, text, bigint, text, text, numeric
);
