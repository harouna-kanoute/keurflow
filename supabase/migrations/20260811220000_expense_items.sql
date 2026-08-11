-- Expense line items (spec §29). quantity × unit_price is always recomputed
-- server-side, mirroring calculateItemTotal() in @keurflow/business (kept in
-- sync manually) — a client-submitted total_minor is never trusted.
create table public.expense_items (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  quantity numeric not null check (quantity > 0),
  unit text not null check (char_length(unit) between 1 and 20),
  unit_price_minor bigint not null check (unit_price_minor > 0),
  total_minor bigint not null default 0,
  created_at timestamptz not null default now()
);

alter table public.expense_items enable row level security;

create function public.recompute_expense_item_total()
returns trigger
language plpgsql
as $$
begin
  new.total_minor := round(new.quantity * new.unit_price_minor);
  return new;
end;
$$;

create trigger expense_items_recompute_total
  before insert or update on public.expense_items
  for each row execute function public.recompute_expense_item_total();

-- Keeps the parent expense's amount_minor equal to the sum of its items
-- whenever it has any — this closes the gap left by only trusting the app's
-- own create-expense flow to do that sum: even a direct API write to
-- expense_items can't make the parent total drift.
create function public.sync_expense_amount_from_items()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_expense_id uuid := coalesce(new.expense_id, old.expense_id);
  items_total bigint;
begin
  select coalesce(sum(total_minor), 0) into items_total
  from public.expense_items
  where expense_id = target_expense_id;

  if items_total > 0 then
    update public.expenses set amount_minor = items_total where id = target_expense_id;
  end if;

  return coalesce(new, old);
end;
$$;

create trigger expense_items_sync_parent_amount
  after insert or update or delete on public.expense_items
  for each row execute function public.sync_expense_amount_from_items();

create function public.get_expense_project_id(target_expense_id uuid)
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select project_id from public.expenses where id = target_expense_id;
$$;

create policy "expense_items_select_related"
  on public.expense_items for select
  to authenticated
  using (
    public.is_organization_member(
      public.get_project_organization_id(public.get_expense_project_id(expense_id))
    )
    or public.is_project_member(public.get_expense_project_id(expense_id))
  );

create policy "expense_items_write_non_viewers"
  on public.expense_items for all
  to authenticated
  using (
    public.get_organization_role(
      public.get_project_organization_id(public.get_expense_project_id(expense_id))
    ) in ('owner', 'admin', 'manager', 'member')
    or public.get_project_role(public.get_expense_project_id(expense_id))
      in ('project_owner', 'project_manager', 'project_member')
  )
  with check (
    public.get_organization_role(
      public.get_project_organization_id(public.get_expense_project_id(expense_id))
    ) in ('owner', 'admin', 'manager', 'member')
    or public.get_project_role(public.get_expense_project_id(expense_id))
      in ('project_owner', 'project_manager', 'project_member')
  );
