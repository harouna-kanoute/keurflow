-- Reports have always computed rich numeric data at creation time (see
-- generateProjectReportSummary) but only ever kept the rendered text, not
-- the numbers themselves — so there was nothing to chart. Nullable and
-- never backfilled for existing rows: reports are an immutable point-in-time
-- snapshot (spec §41), and there's no reliable way to recover structured
-- numbers from old free-text summaries. The UI falls back to text-only for
-- any report where this is null.
alter table public.reports add column metrics jsonb;
