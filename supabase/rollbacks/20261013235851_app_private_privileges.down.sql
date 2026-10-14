-- Rollback de supabase/migrations/20261013235851_app_private_privileges.sql
-- Annule exactement la migration, dans l'ordre inverse de ses instructions.
-- Vérifié par `pnpm db:rollback-check` (ADR 0006).

-- Les deux révocations propres au schéma ne créent aucune entrée dans
-- pg_default_acl (rien n'était accordé) : rien à rétablir.

-- Rétablit le défaut intégré de PostgreSQL (EXECUTE à PUBLIC).
alter default privileges for role postgres
  grant execute on functions to public;

comment on schema app_private is
  'Fonctions internes (SECURITY DEFINER). Aucun droit pour anon ni authenticated.';

revoke usage on schema app_private from authenticated;
