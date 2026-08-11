-- Audit logs (spec §35, §70, §81) — a traceability record of who did what,
-- written automatically by the app after each mutating Server Action
-- succeeds (see apps/web/src/lib/audit.ts), never by the client directly.
-- Deliberately restricted to organization owners/admins on read (§80 least
-- privilege) — an audit trail every member can browse isn't oversight,
-- it's just another activity feed.
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  action text not null check (
    action in (
      'project_created', 'member_invited', 'expense_created', 'expense_updated',
      'expense_approved', 'expense_rejected', 'document_uploaded', 'photo_uploaded',
      'funding_created', 'milestone_updated', 'comment_created', 'report_created'
    )
  ),
  entity_type text not null,
  entity_id uuid,
  -- Never put secrets or full document contents here (§35 "les audit logs ne
  -- doivent pas contenir de secrets") — short human-readable context only,
  -- e.g. { "category": "materials" } or { "amount_minor": 5000 }.
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_logs enable row level security;
alter table public.audit_logs force row level security;

create index audit_logs_organization_id_created_at_idx
  on public.audit_logs (organization_id, created_at desc);
create index audit_logs_project_id_idx on public.audit_logs (project_id) where project_id is not null;

create policy "audit_logs_select_org_admins"
  on public.audit_logs for select
  to authenticated
  using (public.get_organization_role(organization_id) in ('owner', 'admin'));

-- No insert/update/delete policy for `authenticated`: every write goes
-- through logAudit() (apps/web/src/lib/audit.ts) using the service-role
-- admin client, after the triggering action's own authorization has
-- already been checked — a user must never be able to write (or tamper
-- with) their own audit trail.
