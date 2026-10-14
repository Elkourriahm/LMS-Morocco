-- Rollback de supabase/migrations/20261014010144_tenancy_tables.sql
-- Annule exactement la migration, dans l'ordre inverse de ses instructions.
-- Vérifié par `pnpm db:rollback-check` (ADR 0006).
-- Perte de données : établissements, profils et appartenances.

-- Droits, index, triggers, commentaires et RLS disparaissent avec les tables.
drop table public.memberships;
drop table public.profiles;
drop table public.schools;

drop function app_private.set_updated_at();

drop type public.app_role;
drop type public.school_type;
