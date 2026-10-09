-- Rollback de supabase/migrations/20261009010445_app_private_schema.sql
-- Annule exactement la migration, dans l'ordre inverse de ses instructions.
-- Vérifié par `pnpm db:rollback-check` (ADR 0006).

-- Les droits sur le schéma et son commentaire disparaissent avec lui.
-- RESTRICT (défaut) : échoue si une migration ultérieure y a laissé des
-- objets, au lieu de les supprimer en silence.
drop schema app_private;
