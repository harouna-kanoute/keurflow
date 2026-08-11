-- Catalog table (spec §26). Mirrors packages/config/src/paymentMethods.ts —
-- keep both in sync manually. Extensible on purpose: a new African payment
-- rail is a new row here, never a new code path (spec §26 comment).
create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  active boolean not null default true
);

alter table public.payment_methods enable row level security;

create policy "payment_methods_select_all"
  on public.payment_methods for select
  to anon, authenticated
  using (true);

insert into public.payment_methods (code, label, active) values
  ('bank_transfer', 'Virement bancaire', true),
  ('wave', 'Wave', true),
  ('orange_money', 'Orange Money', true),
  ('mobile_money', 'Mobile Money', true),
  ('cash', 'Espèces', true),
  ('other', 'Autre', true);
