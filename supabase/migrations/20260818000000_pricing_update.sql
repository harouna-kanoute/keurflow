-- Real pricing decided for launch (replaces the 0€ placeholder agency
-- prices from 20260811290000_plans.sql — "B2B pricing isn't decided yet" is
-- now resolved). agency_business also moves from 20 to 15 max_active_projects
-- to widen the gap to agency_enterprise. agency_enterprise stays price_minor
-- = 0 — it's sold "sur devis" (negotiated per customer), never self-serve.
update public.plans set price_minor = 1499 where code = 'individual';
update public.plans set price_minor = 2399 where code = 'individual_unlimited';
update public.plans set price_minor = 3099 where code = 'agency_starter';
update public.plans set price_minor = 4499, max_active_projects = 15 where code = 'agency_business';
