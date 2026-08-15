-- profiles.phone was dropped in 20260811350000_security_audit_hardening.sql
-- as dead, unused PII. It's back because it's no longer unused: it now
-- stores the collaborator's WhatsApp number, collected once during invite
-- acceptance (see /reset-password) and used to deep-link "Demander des
-- infos" straight to a chat about the specific expense in question.
alter table public.profiles add column phone text;
