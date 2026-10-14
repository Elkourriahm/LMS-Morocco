-- Fonctions d'aide aux politiques RLS (ADR 0006, 0007).
-- SECURITY DEFINER : elles lisent memberships avec les droits de leur
-- propriétaire (postgres, BYPASSRLS), ce qui évite qu'une politique de
-- memberships se rappelle elle-même. STABLE, search_path vide, noms qualifiés.
-- Elles ne renvoient que ce qui concerne l'utilisateur courant (auth.uid()).
-- EXECUTE est accordé explicitement à authenticated, et à lui seul : le
-- défaut global ne donne rien à PUBLIC (migration app_private_privileges).

-- Établissements dont l'utilisateur courant est membre, quel que soit le rôle.
create function app_private.user_school_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select distinct m.school_id
  from public.memberships m
  where m.user_id = (select auth.uid());
$$;

-- Vrai si l'utilisateur courant a l'un des rôles donnés dans l'établissement.
create function app_private.has_role(p_school_id uuid, p_roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships m
    where m.user_id = (select auth.uid())
      and m.school_id = p_school_id
      and m.role = any (p_roles)
  );
$$;

grant execute on function app_private.user_school_ids() to authenticated;
grant execute on function app_private.has_role(uuid, public.app_role[]) to authenticated;
