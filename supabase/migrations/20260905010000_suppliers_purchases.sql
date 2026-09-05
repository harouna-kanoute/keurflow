-- Fournisseurs & achats de matériaux (MVP privé).
--
-- Deliberately NOT a marketplace: a supplier is private tenant data scoped to
-- ONE organization, never a public directory. There is no public read policy
-- anywhere in this migration — the only way to see a supplier row is to be an
-- active member of its organization, or an active collaborator on a project
-- that actually bought from it (so the chantier's own client/approver can read
-- the supplier name attached to a purchase they're reviewing, and nothing else).
--
-- Scope choice: suppliers hang off organization_id, not project_id, because
-- every individual signs up with their own personal organization
-- (handle_new_user()) — so "my suppliers", "my agency's suppliers" and "my
-- company's suppliers" are all the same rule with no special-casing, and a
-- supplier is reusable across that tenant's chantiers.

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users (id),
  name text not null check (char_length(name) between 2 and 160),
  contact_name text check (char_length(contact_name) <= 160),
  phone text check (char_length(phone) <= 32),
  whatsapp text check (char_length(whatsapp) <= 32),
  email text check (char_length(email) <= 254),
  address text check (char_length(address) <= 240),
  city text check (char_length(city) <= 120),
  country_id uuid not null references public.countries (id),
  specialties text check (char_length(specialties) <= 240),
  notes text check (char_length(notes) <= 2000),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.suppliers enable row level security;

create trigger suppliers_set_updated_at
  before update on public.suppliers
  for each row execute function public.set_updated_at();

create index suppliers_organization_id_idx on public.suppliers (organization_id);

-- Purchases: one material bought once, from one supplier, for one chantier.
-- supplier_id is ON DELETE RESTRICT on purpose — a supplier with history can
-- never be deleted out from under its purchases (§16: deactivate, don't
-- delete). expense_id is ON DELETE SET NULL: deleting the expense must not
-- destroy the purchase record it was reconciled against.
create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  supplier_id uuid not null references public.suppliers (id) on delete restrict,
  expense_id uuid references public.expenses (id) on delete set null,
  created_by uuid not null default auth.uid() references auth.users (id),
  -- Material is a code from packages/config/src/materials.ts (same pattern as
  -- expenses.category / EXPENSE_CATEGORIES): a short shared list, not a
  -- catalog table nobody would curate. material_name carries the free-text
  -- name when the code is 'other'.
  material_code text not null check (char_length(material_code) between 1 and 40),
  material_name text check (char_length(material_name) <= 160),
  description text check (char_length(description) <= 500),
  purchase_date date not null,
  quantity numeric not null check (quantity > 0 and quantity <= 1000000),
  unit text not null check (char_length(unit) between 1 and 20),
  unit_price_minor bigint not null check (unit_price_minor > 0),
  currency_code text not null references public.currencies (code),
  -- Never trusted from the client: recomputed by the trigger below on every
  -- insert and update, exactly like expense_items.total_minor.
  total_amount_minor bigint not null default 0,
  payment_method_id uuid references public.payment_methods (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.purchases enable row level security;

create trigger purchases_set_updated_at
  before update on public.purchases
  for each row execute function public.set_updated_at();

create index purchases_project_id_idx on public.purchases (project_id);
create index purchases_supplier_id_idx on public.purchases (supplier_id);
create index purchases_expense_id_idx on public.purchases (expense_id);

create function public.recompute_purchase_total()
returns trigger
language plpgsql
as $$
begin
  new.total_amount_minor := round(new.quantity * new.unit_price_minor);
  return new;
end;
$$;

create trigger purchases_recompute_total
  before insert or update on public.purchases
  for each row execute function public.recompute_purchase_total();

-- SECURITY DEFINER + stable, same shape as get_project_organization_id: RLS
-- policies on purchases need the supplier's tenant without tripping over
-- suppliers' own RLS.
create function public.get_supplier_organization_id(target_supplier_id uuid)
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select organization_id from public.suppliers where id = target_supplier_id;
$$;

-- The cross-tenant guard that matters: a purchase joins a project and a
-- supplier, so without this a member of org A could attach THEIR project to
-- org B's supplier id and read B's supplier name back through the join.
-- Checked on both insert and update, in the policies below.
create function public.purchase_supplier_matches_project(target_supplier_id uuid, target_project_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.get_supplier_organization_id(target_supplier_id)
       = public.get_project_organization_id(target_project_id);
$$;

-- A project collaborator who is NOT an org member (typically the
-- project_approver — the chantier owner back home invited by an agency) still
-- has to be able to read the supplier attached to a purchase on their own
-- project. Same precedent as organizations_select_project_collaborators
-- (20260813020000). SECURITY DEFINER because the inner reads would otherwise
-- recurse through purchases'/suppliers' own policies.
--
-- Takes the supplier id ONLY to find its purchases — never to look the
-- supplier row itself back up. The tenant check is done in the policy against
-- the row's own organization_id column, because a stable function reading
-- public.suppliers runs on the statement snapshot and therefore cannot see the
-- row an INSERT is currently writing: with the lookup inside, every
-- `insert ... returning` (which is what PostgREST and supabase-js always emit)
-- failed the SELECT policy and came back as 42501.
create function public.supplier_has_project_collaborator(target_supplier_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.purchases p
    join public.project_members pm on pm.project_id = p.project_id
    where p.supplier_id = target_supplier_id
      and pm.user_id = auth.uid()
      and pm.status = 'active'
  );
$$;

-- suppliers RLS -------------------------------------------------------------

create policy "suppliers_select_org_or_purchase_collaborators"
  on public.suppliers for select
  to authenticated
  using (
    public.is_organization_member(organization_id)
    or public.supplier_has_project_collaborator(id)
  );

-- Managing the tenant's supplier directory is an organization-level
-- responsibility (owner/admin/manager), matching who may already manage
-- projects and members — not every project_member who can log a spend.
create policy "suppliers_insert_org_managers"
  on public.suppliers for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and public.is_organization_billing_active(organization_id)
    and public.get_organization_role(organization_id) in ('owner', 'admin', 'manager')
  );

create policy "suppliers_update_org_managers"
  on public.suppliers for update
  to authenticated
  using (public.get_organization_role(organization_id) in ('owner', 'admin', 'manager'))
  with check (public.get_organization_role(organization_id) in ('owner', 'admin', 'manager'));

-- Deletion stays a higher bar than editing, and the ON DELETE RESTRICT above
-- means a supplier that already has purchases can't be removed at all —
-- deactivating it (status = 'inactive') is the supported path.
create policy "suppliers_delete_org_admins"
  on public.suppliers for delete
  to authenticated
  using (public.get_organization_role(organization_id) in ('owner', 'admin'));

-- purchases RLS -------------------------------------------------------------

create policy "purchases_select_org_or_project_members"
  on public.purchases for select
  to authenticated
  using (
    public.is_organization_member(public.get_project_organization_id(project_id))
    or public.is_project_member(project_id)
  );

-- Same "any real collaborator can document a spend" bar as expenses/fundings,
-- plus the billing gate and the cross-tenant supplier guard.
create policy "purchases_insert_non_viewers"
  on public.purchases for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and public.is_organization_billing_active(public.get_project_organization_id(project_id))
    and public.purchase_supplier_matches_project(supplier_id, project_id)
    and (
      public.get_organization_role(public.get_project_organization_id(project_id))
        in ('owner', 'admin', 'manager', 'member')
      or public.get_project_role(project_id)
        in ('project_owner', 'project_manager', 'project_member')
    )
  );

create policy "purchases_update_own_or_managers"
  on public.purchases for update
  to authenticated
  using (
    created_by = auth.uid()
    or public.get_organization_role(public.get_project_organization_id(project_id)) in ('owner', 'admin', 'manager')
    or public.get_project_role(project_id) in ('project_owner', 'project_manager')
  )
  with check (
    public.purchase_supplier_matches_project(supplier_id, project_id)
    and (
      created_by = auth.uid()
      or public.get_organization_role(public.get_project_organization_id(project_id)) in ('owner', 'admin', 'manager')
      or public.get_project_role(project_id) in ('project_owner', 'project_manager')
    )
  );

create policy "purchases_delete_own_or_managers"
  on public.purchases for delete
  to authenticated
  using (
    created_by = auth.uid()
    or public.get_organization_role(public.get_project_organization_id(project_id)) in ('owner', 'admin', 'manager')
    or public.get_project_role(project_id) in ('project_owner', 'project_manager')
  );

-- Justificatifs: reuse the existing documents table and its PRIVATE
-- expense-receipts bucket rather than a second storage path. Third nullable
-- FK, same pattern as expense_id / funding_id — the existing
-- documents_* policies (project-scoped) already cover access, so a purchase
-- receipt is exactly as private as an expense receipt.
alter table public.documents
  add column purchase_id uuid references public.purchases (id) on delete cascade;

create index documents_purchase_id_idx on public.documents (purchase_id);

create function public.get_purchase_project_id(target_purchase_id uuid)
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select project_id from public.purchases where id = target_purchase_id;
$$;

-- documents_insert_non_viewers only ever checked project_id, which was
-- enough while the only FKs were expense_id/funding_id (both project-scoped
-- rows the same policy already covered). purchase_id needs the same
-- guarantee: a document may only be attached to a purchase belonging to the
-- very project it is filed under — otherwise a member of one tenant could
-- attach rows pointing at another tenant's purchase ids.
drop policy "documents_insert_non_viewers" on public.documents;
create policy "documents_insert_non_viewers"
  on public.documents for insert
  to authenticated
  with check (
    uploaded_by = auth.uid()
    and public.is_organization_billing_active(public.get_project_organization_id(project_id))
    and (purchase_id is null or public.get_purchase_project_id(purchase_id) = project_id)
    and (
      public.get_organization_role(public.get_project_organization_id(project_id))
        in ('owner', 'admin', 'manager', 'member')
      or public.get_project_role(project_id)
        in ('project_owner', 'project_manager', 'project_member')
    )
  );

-- Cheque was missing from the payment rails and is standard for supplier
-- settlements — a new row, never a new code path (see the table's own note).
insert into public.payment_methods (code, label, active)
values ('cheque', 'Chèque', true)
on conflict (code) do nothing;

alter table public.audit_logs drop constraint audit_logs_action_check;
alter table public.audit_logs add constraint audit_logs_action_check check (
  action in (
    'project_created', 'project_updated', 'project_deleted', 'member_invited', 'member_updated',
    'member_removed', 'expense_created', 'expense_updated', 'expense_approved', 'expense_rejected',
    'document_uploaded', 'photo_uploaded', 'photo_deleted', 'funding_created', 'milestone_updated',
    'comment_created', 'report_created', 'organization_updated', 'document_deleted',
    'supplier_created', 'supplier_updated', 'purchase_created', 'purchase_updated', 'purchase_deleted'
  )
);
