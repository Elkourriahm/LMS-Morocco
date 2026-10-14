-- Politiques RLS de schools, profiles et memberships (ADR 0007).
-- Une politique par opération autorisée, réservée à authenticated. Une
-- opération sans politique est refusée par la RLS ; elle l'est aussi, avant
-- la RLS, par l'absence de droit (migration tenancy_tables) :
--   - schools : pas d'INSERT ni de DELETE (création par la plateforme) ;
--   - memberships : pas d'INSERT, UPDATE ni DELETE (invitations côté serveur, S1-c) ;
--   - profiles : pas d'INSERT (trigger d'inscription) ni de DELETE (cascade
--     depuis auth.users).
-- anon n'a aucune politique ni aucun droit. Forme (select auth.uid()) et
-- (select app_private.user_school_ids()) : évaluées une fois par requête.

-- --- schools ----------------------------------------------------------------

create policy schools_select_membre
  on public.schools for select to authenticated
  using (id in (select app_private.user_school_ids()));

create policy schools_update_direction
  on public.schools for update to authenticated
  using (app_private.has_role(id, array['direction']::public.app_role[]))
  with check (app_private.has_role(id, array['direction']::public.app_role[]));

-- --- memberships ------------------------------------------------------------

-- Ses propres appartenances, ou toutes celles d'un établissement qu'on dirige.
create policy memberships_select_soi_ou_direction
  on public.memberships for select to authenticated
  using (
    user_id = (select auth.uid())
    or app_private.has_role(school_id, array['direction']::public.app_role[])
  );

-- --- profiles ---------------------------------------------------------------

-- Son propre profil, ou celui d'un membre d'un établissement qu'on dirige. Un
-- parent, un enseignant ou la caisse ne voit que le sien.
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

create policy profiles_update_soi
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
