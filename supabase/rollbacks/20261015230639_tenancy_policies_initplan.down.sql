-- Rollback de supabase/migrations/20261015230639_tenancy_policies_initplan.sql
-- Annule exactement la migration, dans l'ordre inverse de ses instructions.
-- Vérifié par `pnpm db:rollback-check` (ADR 0006).
-- Restaure à l'identique les politiques de la migration tenancy_policies.

drop policy profiles_select_soi_ou_direction on public.profiles;

create policy profiles_select_soi_ou_direction
  on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or exists (
      select 1
      from public.memberships m
      where m.user_id = profiles.id
        and m.school_id in (select app_private.user_school_ids())
        and app_private.has_role(m.school_id, array['direction']::public.app_role[])
    )
  );

drop policy memberships_select_soi_ou_direction on public.memberships;

create policy memberships_select_soi_ou_direction
  on public.memberships for select to authenticated
  using (
    user_id = (select auth.uid())
    or app_private.has_role(school_id, array['direction']::public.app_role[])
  );

drop policy schools_update_direction on public.schools;

create policy schools_update_direction
  on public.schools for update to authenticated
  using (app_private.has_role(id, array['direction']::public.app_role[]))
  with check (app_private.has_role(id, array['direction']::public.app_role[]));

-- Le GRANT disparaît avec la fonction.
drop function app_private.user_school_ids_with_roles(public.app_role[]);
