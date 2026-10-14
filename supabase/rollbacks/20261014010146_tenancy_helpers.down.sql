-- Rollback de supabase/migrations/20261014010146_tenancy_helpers.sql
-- Annule exactement la migration, dans l'ordre inverse de ses instructions.
-- Vérifié par `pnpm db:rollback-check` (ADR 0006).

-- Les GRANT disparaissent avec les fonctions.
drop function app_private.has_role(uuid, public.app_role[]);
drop function app_private.user_school_ids();
