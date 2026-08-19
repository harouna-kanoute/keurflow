-- Multi-currency billing (user request: Franc CFA for agencies based in
-- Africa). Stripe subscriptions have an immutable currency once created —
-- switching plan or billing period on a live subscription must always
-- reuse the currency it was already created in, never recompute it from
-- the organization's country. This column is that source of truth, kept in
-- sync from Stripe's own price.currency in the webhook (same reasoning as
-- billing_period — Stripe already tracks it natively, so read it from
-- there instead of duplicating it in metadata).
alter table public.subscriptions
  add column currency_code text not null default 'EUR' references public.currencies (code);
