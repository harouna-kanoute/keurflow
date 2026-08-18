-- deleteAccount() (apps/web/src/app/dashboard/settings/actions.ts) calls
-- admin.auth.admin.deleteUser(), which today fails with a foreign key
-- violation for any user who has ever uploaded a photo/document or created
-- an expense/funding/report — these five columns reference auth.users with
-- no "on delete" clause, defaulting to NO ACTION. A chantier's financial
-- records belong to the whole team, not just their author, so the fix
-- preserves the row and nulls out who created it (same precedent as
-- audit_logs.user_id, see 20260812110000_audit_logs.sql) rather than
-- cascading the delete, which would destroy other members' shared history.
alter table public.photos alter column uploaded_by drop not null;
alter table public.photos drop constraint photos_uploaded_by_fkey;
alter table public.photos add constraint photos_uploaded_by_fkey
  foreign key (uploaded_by) references auth.users (id) on delete set null;

alter table public.documents alter column uploaded_by drop not null;
alter table public.documents drop constraint documents_uploaded_by_fkey;
alter table public.documents add constraint documents_uploaded_by_fkey
  foreign key (uploaded_by) references auth.users (id) on delete set null;

alter table public.expenses alter column created_by drop not null;
alter table public.expenses drop constraint expenses_created_by_fkey;
alter table public.expenses add constraint expenses_created_by_fkey
  foreign key (created_by) references auth.users (id) on delete set null;

alter table public.fundings alter column created_by drop not null;
alter table public.fundings drop constraint fundings_created_by_fkey;
alter table public.fundings add constraint fundings_created_by_fkey
  foreign key (created_by) references auth.users (id) on delete set null;

alter table public.reports alter column created_by drop not null;
alter table public.reports drop constraint reports_created_by_fkey;
alter table public.reports add constraint reports_created_by_fkey
  foreign key (created_by) references auth.users (id) on delete set null;
