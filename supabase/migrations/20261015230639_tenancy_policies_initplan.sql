-- Politiques RLS évaluées une fois par requête (ADR 0007).
-- has_role(school_id, ...) dépend de la ligne : Postgres l'appelait pour
-- chaque ligne lue (999 appels pour 1 000 memberships). On la remplace dans
-- les politiques par une fonction d'ensemble sans argument lié à la ligne,
-- sous la forme colonne IN (SELECT fonction(...)) : la sous-requête est
-- évaluée une seule fois, puis comparée par hachage.
-- has_role() reste disponible pour les vérifications ponctuelles côté serveur.

-- Établissements où l'utilisateur courant a l'un des rôles donnés.
-- Mêmes garanties que user_school_ids() : SECURITY DEFINER (lecture de
-- memberships sans récursion RLS), STABLE, search_path vide, noms qualifiés,
-- résultat limité à auth.uid(). EXECUTE pour authenticated seul.
create function app_private.user_school_ids_with_roles(p_roles public.app_role[])
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select distinct m.school_id
  from public.memberships m
  where m.user_id = (select auth.uid())
    and m.role = any (p_roles);
$$;

grant execute on function app_private.user_school_ids_with_roles(public.app_role[]) to authenticated;

-- --- schools ----------------------------------------------------------------

drop policy schools_update_direction on public.schools;

create policy schools_update_direction
  on public.schools for update to authenticated
  using (id in (select app_private.user_school_ids_with_roles('{direction}'::public.app_role[])))
  with check (id in (select app_private.user_school_ids_with_roles('{direction}'::public.app_role[])));

-- --- memberships ------------------------------------------------------------

drop policy memberships_select_soi_ou_direction on public.memberships;

-- Ses propres appartenances, ou toutes celles d'un établissement qu'on dirige.
create policy memberships_select_soi_ou_direction
  on public.memberships for select to authenticated
  using (
    user_id = (select auth.uid())
    or school_id in (select app_private.user_school_ids_with_roles('{direction}'::public.app_role[]))
  );

-- --- profiles ---------------------------------------------------------------

drop policy profiles_select_soi_ou_direction on public.profiles;

-- Son propre profil, ou celui d'un membre d'un établissement qu'on dirige. La
-- sous-requête n'est pas corrélée à la ligne de profiles : évaluée une fois.
create policy profiles_select_soi_ou_direction
  on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or id in (
      select m.user_id
      from public.memberships m
      where m.school_id in (select app_private.user_school_ids_with_roles('{direction}'::public.app_role[]))
    )
  );
