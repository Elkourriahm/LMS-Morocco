-- Rollback de supabase/migrations/20261014010149_tenancy_policies.sql
-- Annule exactement la migration, dans l'ordre inverse de ses instructions.
-- Vérifié par `pnpm db:rollback-check` (ADR 0006).
-- La RLS reste activée (migration tenancy_tables) : sans politique, tout est
-- refusé à authenticated.

drop policy profiles_update_soi on public.profiles;
drop policy profiles_select_soi_ou_direction on public.profiles;
drop policy memberships_select_soi_ou_direction on public.memberships;
drop policy schools_update_direction on public.schools;
drop policy schools_select_membre on public.schools;
