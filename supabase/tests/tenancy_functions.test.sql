-- Fonctions d'aide RLS et trigger d'inscription (ADR 0007).
-- Lancé par `pnpm db:test`. Transaction annulée à la fin.

begin;

create extension if not exists pgtap with schema extensions;

\ir helpers/auth.psql
\ir helpers/tenancy_fixtures.psql

select plan(27);

-- =============================================================================
-- 1. Droits et définition
-- =============================================================================

select ok(
  has_function_privilege('authenticated', 'app_private.user_school_ids()', 'EXECUTE')
  and has_function_privilege('authenticated', 'app_private.has_role(uuid, public.app_role[])', 'EXECUTE'),
  'authenticated peut exécuter user_school_ids et has_role'
);
select ok(
  not has_function_privilege('anon', 'app_private.user_school_ids()', 'EXECUTE')
  and not has_function_privilege('anon', 'app_private.has_role(uuid, public.app_role[])', 'EXECUTE'),
  'anon ne peut exécuter ni user_school_ids ni has_role'
);
select ok(
  not has_function_privilege('authenticated', 'app_private.handle_new_user()', 'EXECUTE')
  and not has_function_privilege('anon', 'app_private.handle_new_user()', 'EXECUTE'),
  'le trigger d''inscription n''est pas exécutable par anon ni authenticated'
);
select is_empty(
  $$ select p.oid::regprocedure
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
     where p.prosecdef
       and n.nspname in ('public', 'app_private')
       and not ('search_path=""' = any (coalesce(p.proconfig, '{}'))) $$,
  'toute fonction SECURITY DEFINER du projet fixe search_path à vide'
);
select is_empty(
  $$ select p.oid::regprocedure
     from pg_proc p
     where p.prosecdef and p.pronamespace = 'public'::regnamespace $$,
  'aucune fonction SECURITY DEFINER dans public'
);
select set_eq(
  $$ select p.proname::text
     from pg_proc p
     where p.prosecdef and p.pronamespace = 'app_private'::regnamespace $$,
  array['user_school_ids', 'has_role', 'user_school_ids_with_roles', 'handle_new_user'],
  'fonctions SECURITY DEFINER de app_private : les aides RLS et le trigger d''inscription'
);
select is_empty(
  $$ select p.oid::regprocedure
     from pg_proc p
     where p.pronamespace = 'app_private'::regnamespace
       and p.proname in ('user_school_ids', 'has_role')
       and p.provolatile <> 's' $$,
  'user_school_ids et has_role sont STABLE'
);

-- user_school_ids_with_roles : fonction d'ensemble des politiques RLS.
select ok(
  has_function_privilege('authenticated', 'app_private.user_school_ids_with_roles(public.app_role[])', 'EXECUTE'),
  'authenticated peut exécuter user_school_ids_with_roles'
);
select ok(
  not has_function_privilege('anon', 'app_private.user_school_ids_with_roles(public.app_role[])', 'EXECUTE'),
  'anon ne peut pas exécuter user_school_ids_with_roles'
);
select hasnt_function(
  'public', 'user_school_ids_with_roles',
  'user_school_ids_with_roles n''existe pas dans public'
);
select is_empty(
  $$ select p.oid::regprocedure
     from pg_proc p
     where p.pronamespace = 'app_private'::regnamespace
       and p.proname = 'user_school_ids_with_roles'
       and p.provolatile <> 's' $$,
  'user_school_ids_with_roles est STABLE'
);
-- Règle CLAUDE.md : dans une politique, une fonction d'ensemble évaluée une
-- fois par requête, jamais has_role() évaluée ligne par ligne.
select is_empty(
  $$ select tablename, policyname from pg_policies
     where schemaname = 'public'
       and (qual like '%has_role(%' or with_check like '%has_role(%') $$,
  'aucune politique de public n''appelle has_role() (évaluée ligne par ligne)'
);

-- =============================================================================
-- 2. Comportement
-- =============================================================================

select tests.authenticate_as(tests.id('u_a'));
select results_eq(
  'select * from app_private.user_school_ids()',
  array[tests.id('school_a')],
  'user_school_ids : A une seule fois pour u_a, malgré deux rôles'
);
select ok(
  app_private.has_role(tests.id('school_a'), array['direction']::public.app_role[]),
  'has_role : u_a est direction de A'
);
select ok(
  app_private.has_role(tests.id('school_a'), array['parent', 'caisse']::public.app_role[]),
  'has_role : vrai si l''un des rôles demandés correspond'
);
select ok(
  not app_private.has_role(tests.id('school_a'), array['parent', 'enseignant']::public.app_role[]),
  'has_role : faux pour un rôle que u_a n''a pas'
);
select ok(
  not app_private.has_role(tests.id('school_b'), array['direction']::public.app_role[]),
  'has_role : faux dans un établissement dont u_a n''est pas membre'
);

select results_eq(
  $$ select * from app_private.user_school_ids_with_roles('{direction}') $$,
  array[tests.id('school_a')],
  'user_school_ids_with_roles : A pour u_a en direction'
);
select results_eq(
  $$ select * from app_private.user_school_ids_with_roles('{caisse,direction}') $$,
  array[tests.id('school_a')],
  'user_school_ids_with_roles : A une seule fois malgré deux rôles correspondants'
);
select is_empty(
  $$ select * from app_private.user_school_ids_with_roles('{parent,enseignant}') $$,
  'user_school_ids_with_roles : vide pour des rôles que u_a n''a pas'
);

select tests.authenticate_as(tests.id('dir_b'));
select results_eq(
  'select * from app_private.user_school_ids()',
  array[tests.id('school_b')],
  'user_school_ids : B seulement pour dir_b'
);

-- authenticated sans sub (jeton incomplet) : auth.uid() nul, rien.
select tests.clear_authentication();
select set_config('role', 'authenticated', true);
select is_empty(
  'select * from app_private.user_school_ids()',
  'user_school_ids : vide sans utilisateur identifié'
);
select is_empty(
  $$ select * from app_private.user_school_ids_with_roles('{direction}') $$,
  'user_school_ids_with_roles : vide sans utilisateur identifié'
);

select tests.authenticate_as_anon();
select throws_ok(
  'select * from app_private.user_school_ids()',
  '42501', null,
  'anon ne peut pas appeler user_school_ids'
);

-- =============================================================================
-- 3. Trigger d'inscription
-- =============================================================================

select tests.clear_authentication();

select tests.create_user(
  '00000000-0000-4000-8000-0000000000c1', 'nouveau@example.test',
  '{"full_name": "Nouvel utilisateur", "preferred_locale": "ar"}'
);
select results_eq(
  $$ select full_name, preferred_locale from public.profiles
     where id = '00000000-0000-4000-8000-0000000000c1' $$,
  $$ values ('Nouvel utilisateur', 'ar') $$,
  'l''inscription crée le profil avec le nom et la langue fournis'
);

select tests.create_user(
  '00000000-0000-4000-8000-0000000000c2', 'autre@example.test',
  jsonb_build_object('full_name', repeat('x', 300), 'preferred_locale', 'en')
);
select results_eq(
  $$ select char_length(full_name), preferred_locale from public.profiles
     where id = '00000000-0000-4000-8000-0000000000c2' $$,
  $$ values (200, 'fr') $$,
  'métadonnées invalides : nom tronqué à 200, langue ramenée à fr'
);

-- L'insertion réelle est faite par GoTrue (supabase_auth_admin), rôle que
-- postgres ne peut pas prendre en local : vérifiée par une inscription de
-- bout en bout en S1-b. La fonction est SECURITY DEFINER (section 1).

-- Suppression du compte : profil et memberships suivent (ON DELETE CASCADE).
delete from auth.users where id = tests.id('parent_a');
select is_empty(
  $$ select 1 from public.profiles where id = tests.id('parent_a')
     union all select 1 from public.memberships where user_id = tests.id('parent_a') $$,
  'supprimer un utilisateur supprime son profil et ses memberships'
);

select * from finish();

rollback;
