-- Rollback de supabase/migrations/20261014010151_profiles_on_signup.sql
-- Annule exactement la migration, dans l'ordre inverse de ses instructions.
-- Vérifié par `pnpm db:rollback-check` (ADR 0006).
-- Les profils déjà créés restent en place.

drop trigger on_auth_user_created on auth.users;
drop function app_private.handle_new_user();
