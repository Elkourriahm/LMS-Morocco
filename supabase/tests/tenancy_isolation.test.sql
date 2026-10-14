-- Isolation entre établissements et droits par rôle sur schools, memberships
-- et profiles (ADR 0007). Modèle pour les tests des futures tables métier :
-- helpers/auth.psql + helpers/tenancy_fixtures.psql, puis une section par
-- utilisateur simulé (tests.authenticate_as).
-- Lancé par `pnpm db:test`. Transaction annulée à la fin.

begin;

create extension if not exists pgtap with schema extensions;

\ir helpers/auth.psql
\ir helpers/tenancy_fixtures.psql

select plan(51);

-- =============================================================================
-- 1. Isolation entre établissements
-- =============================================================================

-- --- Direction de A ---------------------------------------------------------
select tests.authenticate_as(tests.id('dir_a'));

select results_eq(
  'select id from public.schools',
  array[tests.id('school_a')],
  'dir_a ne voit que l''établissement A'
);
select is_empty(
  $$ select id from public.memberships where school_id = tests.id('school_b') $$,
  'dir_a ne voit aucun membership de B'
);
select is(
  (select count(*)::int from public.memberships),
  6,
  'dir_a voit tous les memberships de A (6, dont les deux rôles de u_a)'
);
select set_eq(
  'select id from public.profiles',
  $$ select id from tests.fixtures
     where name in ('dir_a', 'caisse_a', 'ens_a', 'parent_a', 'u_a') $$,
  'dir_a voit les profils des membres de A, et eux seuls'
);
select is_empty(
  $$ select id from public.profiles where id = tests.id('dir_b') $$,
  'dir_a ne voit pas le profil de la direction de B'
);
select is(
  tests.affected_rows($$ update public.schools set name = 'Piraté' where id = tests.id('school_b') $$),
  0,
  'dir_a ne peut pas modifier l''établissement B (0 ligne)'
);

-- --- Direction de B ---------------------------------------------------------
select tests.authenticate_as(tests.id('dir_b'));

select results_eq(
  'select id from public.schools',
  array[tests.id('school_b')],
  'dir_b ne voit que l''établissement B'
);
select set_eq(
  'select user_id from public.memberships',
  array[tests.id('dir_b')],
  'dir_b ne voit que le membership de B'
);
select set_eq(
  'select id from public.profiles',
  array[tests.id('dir_b')],
  'dir_b ne voit aucun profil de A'
);
select is(
  tests.affected_rows($$ update public.schools set name = 'Piraté' where id = tests.id('school_a') $$),
  0,
  'dir_b ne peut pas modifier l''établissement A (0 ligne)'
);

-- --- Aucun utilisateur de A ne voit une ligne de B --------------------------
select tests.authenticate_as(tests.id('caisse_a'));
select is_empty(
  $$ select id from public.schools where id = tests.id('school_b')
     union all select id from public.memberships where school_id = tests.id('school_b')
     union all select id from public.profiles where id = tests.id('dir_b') $$,
  'caisse_a ne voit aucune ligne de B'
);
select tests.authenticate_as(tests.id('ens_a'));
select is_empty(
  $$ select id from public.schools where id = tests.id('school_b')
     union all select id from public.memberships where school_id = tests.id('school_b')
     union all select id from public.profiles where id = tests.id('dir_b') $$,
  'ens_a ne voit aucune ligne de B'
);
select tests.authenticate_as(tests.id('parent_a'));
select is_empty(
  $$ select id from public.schools where id = tests.id('school_b')
     union all select id from public.memberships where school_id = tests.id('school_b')
     union all select id from public.profiles where id = tests.id('dir_b') $$,
  'parent_a ne voit aucune ligne de B'
);
select tests.authenticate_as(tests.id('u_a'));
select is_empty(
  $$ select id from public.schools where id = tests.id('school_b')
     union all select id from public.memberships where school_id = tests.id('school_b')
     union all select id from public.profiles where id = tests.id('dir_b') $$,
  'u_a ne voit aucune ligne de B'
);

-- =============================================================================
-- 2. Rôles
-- =============================================================================

select tests.authenticate_as(tests.id('parent_a'));
select set_eq(
  'select id from public.profiles',
  array[tests.id('parent_a')],
  'parent_a ne voit que son profil'
);
select set_eq(
  'select user_id from public.memberships',
  array[tests.id('parent_a')],
  'parent_a ne voit que ses propres memberships'
);
select results_eq(
  'select id from public.schools',
  array[tests.id('school_a')],
  'parent_a voit son établissement'
);

select tests.authenticate_as(tests.id('ens_a'));
select set_eq(
  'select id from public.profiles',
  array[tests.id('ens_a')],
  'ens_a ne voit pas les profils des autres membres'
);
select set_eq(
  'select user_id from public.memberships',
  array[tests.id('ens_a')],
  'ens_a ne voit que ses propres memberships'
);

select tests.authenticate_as(tests.id('caisse_a'));
select set_eq(
  'select id from public.profiles',
  array[tests.id('caisse_a')],
  'caisse_a ne voit que son profil'
);
select is(
  tests.affected_rows($$ update public.schools set name = 'Caisse' where id = tests.id('school_a') $$),
  0,
  'caisse_a ne peut pas modifier l''établissement A (0 ligne)'
);

select tests.authenticate_as(tests.id('u_a'));
select results_eq(
  'select id from public.schools',
  array[tests.id('school_a')],
  'u_a (direction et caisse) voit l''établissement A une seule fois'
);
select is(
  (select count(*)::int from public.memberships),
  6,
  'u_a voit les memberships de A grâce à son rôle direction'
);
select is(
  tests.affected_rows($$ update public.schools set default_locale = 'fr' where id = tests.id('school_a') $$),
  1,
  'u_a peut modifier A : le rôle direction suffit, même cumulé avec caisse'
);

-- =============================================================================
-- 3. Écriture et colonnes
-- =============================================================================

-- --- memberships : aucune écriture, même dans son établissement --------------
select tests.authenticate_as(tests.id('dir_a'));
select throws_ok(
  $$ insert into public.memberships (school_id, user_id, role)
     values (tests.id('school_a'), tests.id('parent_a'), 'direction') $$,
  '42501', null,
  'dir_a ne peut pas insérer de membership dans A'
);
select throws_ok(
  $$ update public.memberships set role = 'direction' where user_id = tests.id('ens_a') $$,
  '42501', null,
  'dir_a ne peut pas modifier un membership de A'
);
select throws_ok(
  $$ delete from public.memberships where user_id = tests.id('parent_a') $$,
  '42501', null,
  'dir_a ne peut pas supprimer un membership de A'
);
select tests.authenticate_as(tests.id('caisse_a'));
select throws_ok(
  $$ insert into public.memberships (school_id, user_id, role)
     values (tests.id('school_a'), tests.id('caisse_a'), 'direction') $$,
  '42501', null,
  'caisse_a ne peut pas s''attribuer le rôle direction'
);

-- --- profiles : seulement le sien -------------------------------------------
select tests.authenticate_as(tests.id('dir_a'));
select is(
  tests.affected_rows($$ update public.profiles set full_name = 'X' where id = tests.id('caisse_a') $$),
  0,
  'dir_a voit le profil de caisse_a mais ne peut pas le modifier (0 ligne)'
);
select tests.authenticate_as(tests.id('parent_a'));
select is(
  tests.affected_rows($$ update public.profiles set full_name = 'X' where id = tests.id('dir_a') $$),
  0,
  'parent_a ne peut pas modifier le profil de dir_a (0 ligne)'
);

-- --- schools : colonnes modifiables par la direction ------------------------
select tests.authenticate_as(tests.id('dir_a'));
select is(
  tests.affected_rows($$ update public.schools set name = 'École A renommée', default_locale = 'ar'
                          where id = tests.id('school_a') $$),
  1,
  'dir_a peut modifier name et default_locale de A'
);
select is(
  (select name || ' / ' || default_locale from public.schools where id = tests.id('school_a')),
  'École A renommée / ar',
  'les nouvelles valeurs de A sont enregistrées'
);
select throws_ok(
  $$ update public.schools set type = 'centre' where id = tests.id('school_a') $$,
  '42501', null,
  'dir_a ne peut pas modifier le type de A (droit de colonne)'
);
select throws_ok(
  $$ update public.schools set timezone = 'UTC' where id = tests.id('school_a') $$,
  '42501', null,
  'dir_a ne peut pas modifier le fuseau de A (droit de colonne)'
);
select throws_ok(
  $$ update public.schools set updated_at = now() where id = tests.id('school_a') $$,
  '42501', null,
  'dir_a ne peut pas écrire updated_at (maintenu par trigger)'
);

-- --- profiles : colonnes modifiables par soi --------------------------------
-- updated_at vieilli en tant que postgres, pour vérifier le trigger ensuite.
select tests.clear_authentication();
update public.profiles set updated_at = '2000-01-01' where id = tests.id('ens_a');

select tests.authenticate_as(tests.id('ens_a'));
select is(
  tests.affected_rows($$ update public.profiles set full_name = 'Enseignant renommé', preferred_locale = 'ar'
                          where id = tests.id('ens_a') $$),
  1,
  'ens_a peut modifier son full_name et sa langue'
);
select is(
  (select updated_at from public.profiles where id = tests.id('ens_a')),
  now(),
  'updated_at est mis à jour par le trigger'
);
select throws_ok(
  $$ update public.profiles set id = gen_random_uuid() where id = tests.id('ens_a') $$,
  '42501', null,
  'ens_a ne peut pas modifier l''id de son profil'
);
select throws_ok(
  $$ update public.profiles set created_at = now() where id = tests.id('ens_a') $$,
  '42501', null,
  'ens_a ne peut pas modifier created_at de son profil'
);
select throws_ok(
  $$ insert into public.profiles (id) values (gen_random_uuid()) $$,
  '42501', null,
  'ens_a ne peut pas créer de profil'
);
select throws_ok(
  $$ delete from public.profiles where id = tests.id('ens_a') $$,
  '42501', null,
  'ens_a ne peut pas supprimer son profil'
);
select throws_ok(
  $$ insert into public.schools (name, type) values ('Nouvelle', 'ecole') $$,
  '42501', null,
  'authenticated ne peut pas créer d''établissement'
);

-- =============================================================================
-- 4. anon : aucun accès
-- =============================================================================

select tests.authenticate_as_anon();
select throws_ok('select * from public.schools', '42501', null, 'anon ne lit pas schools');
select throws_ok('select * from public.memberships', '42501', null, 'anon ne lit pas memberships');
select throws_ok('select * from public.profiles', '42501', null, 'anon ne lit pas profiles');

-- =============================================================================
-- 5. Garde-fous structurels
-- =============================================================================

select tests.clear_authentication();

select is_empty(
  $$ select c.relname from pg_class c
     where c.oid in ('public.schools'::regclass, 'public.memberships'::regclass, 'public.profiles'::regclass)
       and not c.relrowsecurity $$,
  'RLS activée sur schools, memberships et profiles'
);
select is_empty(
  $$ select tablename, policyname from pg_policies
     where schemaname = 'public'
       and (qual = 'true' or with_check = 'true') $$,
  'aucune politique USING (true) ni WITH CHECK (true) dans public'
);
select is_empty(
  $$ select tablename, policyname, roles from pg_policies
     where schemaname = 'public'
       and roles <> array['authenticated']::name[] $$,
  'toutes les politiques de public visent authenticated seul (rien pour anon ni PUBLIC)'
);
select policies_are('public', 'schools',
  array['schools_select_membre', 'schools_update_direction'],
  'politiques de schools : select et update seulement');
select policies_are('public', 'memberships',
  array['memberships_select_soi_ou_direction'],
  'politiques de memberships : select seulement');
select policies_are('public', 'profiles',
  array['profiles_select_soi_ou_direction', 'profiles_update_soi'],
  'politiques de profiles : select et update seulement');

select * from finish();

rollback;
