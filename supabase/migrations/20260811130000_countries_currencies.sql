-- Catalog/reference tables (spec §24-26). Mirrors packages/config/src/{countries,currencies}.ts —
-- keep both in sync manually. These are read-only from the app's perspective: rows are
-- managed exclusively via migrations, never by an INSERT/UPDATE/DELETE from the client,
-- so there is intentionally no write policy for the authenticated role.
create table public.currencies (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (char_length(code) = 3),
  name text not null,
  symbol text not null,
  minor_unit smallint not null default 2 check (minor_unit >= 0),
  active boolean not null default true
);

alter table public.currencies enable row level security;

create policy "currencies_select_all"
  on public.currencies for select
  to anon, authenticated
  using (true);

create table public.countries (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (char_length(code) = 2),
  name text not null,
  currency_code text not null references public.currencies (code),
  active boolean not null default true
);

alter table public.countries enable row level security;

create policy "countries_select_all"
  on public.countries for select
  to anon, authenticated
  using (true);

insert into public.currencies (code, name, symbol, minor_unit, active) values
  ('EUR', 'Euro', '€', 2, true),
  ('XOF', 'Franc CFA (BCEAO)', 'F CFA', 0, true),
  ('XAF', 'Franc CFA (BEAC)', 'F CFA', 0, true),
  ('GNF', 'Franc guinéen', 'FG', 0, true),
  ('MRU', 'Ouguiya mauritanien', 'UM', 2, true),
  ('CDF', 'Franc congolais', 'FC', 2, true),
  ('CVE', 'Escudo cap-verdien', '$', 2, false),
  ('USD', 'Dollar américain', '$', 2, true),
  ('GBP', 'Livre sterling', '£', 2, true),
  ('CAD', 'Dollar canadien', '$', 2, true);

insert into public.countries (code, name, currency_code, active) values
  ('SN', 'Sénégal', 'XOF', true),
  ('CI', 'Côte d''Ivoire', 'XOF', true),
  ('ML', 'Mali', 'XOF', true),
  ('GN', 'Guinée', 'GNF', true),
  ('MR', 'Mauritanie', 'MRU', true),
  ('BF', 'Burkina Faso', 'XOF', true),
  ('NE', 'Niger', 'XOF', true),
  ('BJ', 'Bénin', 'XOF', true),
  ('TG', 'Togo', 'XOF', true),
  ('CM', 'Cameroun', 'XAF', true),
  ('GA', 'Gabon', 'XAF', true),
  ('CG', 'Congo', 'XAF', true),
  ('CD', 'RDC', 'CDF', true),
  ('CV', 'Cap-Vert', 'CVE', false);
