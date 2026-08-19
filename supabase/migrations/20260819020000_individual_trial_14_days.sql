-- Uniform 14-day free trial across every plan (user request: "14 jours
-- gratuit partout"). individual_trial was the only outlier at 7 days —
-- agency plans have always been 14. Only affects orgs created after this
-- runs; existing trialing subscriptions keep the trial_ends_at already
-- computed from the old value.
update public.plans set trial_days = 14 where code = 'individual_trial';
