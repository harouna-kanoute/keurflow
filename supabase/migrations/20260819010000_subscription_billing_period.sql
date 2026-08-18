-- Monthly vs. annual billing (user request: fixed monthly price, or annual
-- with a 20% discount). The discount is computed in code from the existing
-- monthly `plans.price_minor` (packages/business's getAnnualPriceMinor) —
-- no separate annual price column, same reasoning as Stripe prices already
-- being built with dynamic `price_data` rather than pre-created Price
-- objects (apps/web/dashboard/billing/actions.ts): one number to keep in
-- sync, not two.
alter table public.subscriptions
  add column billing_period text not null default 'month'
    check (billing_period in ('month', 'year'));
