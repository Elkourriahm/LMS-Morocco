-- Droits sur le schéma app_private (ADR 0006) : non exposé par l'API, aucun
-- droit pour anon, USAGE seul pour authenticated, aucune fonction ni table
-- accessible par défaut.
-- Lancé par `pnpm db:test` (pgTAP, ADR 0006). Chaque fichier est exécuté
-- dans une transaction annulée à la fin : aucun effet sur la base.
--
-- Modèle pour les futurs tests RLS. Structure prévue pour l'isolation entre
-- deux établissements (story S1), un fichier par table métier :
--
--   1. Préparation, en tant que postgres (contourne la RLS) :
--        - deux établissements A et B dans schools ;
--        - un utilisateur par établissement dans auth.users, rattaché à son
--          établissement (et à un rôle : direction, caisse, enseignant, parent) ;
--        - une ou plusieurs lignes de la table testée pour A et pour B.
--   2. Se faire passer pour l'utilisateur de A :
--        set local role authenticated;
--        select set_config('request.jwt.claims',
--          json_build_object('sub', '<uuid utilisateur A>', 'role', 'authenticated')::text,
--          true);
--   3. Vérifier, pour la table testée :
--        - SELECT ne renvoie que les lignes de A (results_eq / is_empty sur B) ;
--        - INSERT avec school_id = B échoue (throws_ok '42501') ;
--        - UPDATE et DELETE sur une ligne de B n'affectent aucune ligne ;
--        - les droits propres au rôle (ex. un parent ne voit que ses enfants).
--   4. Même chose en tant qu'utilisateur de B, puis en tant qu'anon (rien).
--   5. reset role; puis vérifier que la RLS est activée (et forcée si besoin) :
--        select is((select relrowsecurity from pg_class
--                   where oid = 'public.<table>'::regclass), true, '...');

begin;

create extension if not exists pgtap with schema extensions;

select plan(17);

select has_schema('app_private', 'le schéma app_private existe');

-- 1. Droits sur le schéma lui-même (USAGE, CREATE), y compris hérités de
--    PUBLIC.
select schema_privs_are(
  'app_private', 'anon', array[]::text[],
  'anon n''a aucun droit sur le schéma app_private'
);
select schema_privs_are(
  'app_private', 'authenticated', array['USAGE'],
  'authenticated a USAGE sur app_private, et rien d''autre'
);

-- 2. Objets existants : aucune table, séquence ni fonction accessible.
select is_empty(
  $$
    select c.relname, r.rolname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    cross join (values ('anon'), ('authenticated')) as r (rolname)
    where n.nspname = 'app_private'
      and (
        has_table_privilege(r.rolname, c.oid, 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER')
        or (c.relkind = 'S' and has_sequence_privilege(r.rolname, c.oid, 'USAGE, SELECT, UPDATE'))
      )
  $$,
  'anon et authenticated n''ont aucun droit sur les tables et séquences de app_private'
);
select is_empty(
  $$
    select p.proname, r.rolname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    cross join (values ('anon'), ('authenticated')) as r (rolname)
    where n.nspname = 'app_private'
      and has_function_privilege(r.rolname, p.oid, 'EXECUTE')
  $$,
  'anon et authenticated ne peuvent exécuter aucune fonction de app_private'
);

-- 3. Droits par défaut : aucun défaut propre au schéma ne profite à PUBLIC,
--    anon ou authenticated, et le défaut global de postgres ne donne plus
--    EXECUTE à PUBLIC sur les fonctions.
select is_empty(
  $$
    select d.defaclrole::regrole, d.defaclobjtype, a.privilege_type
    from pg_default_acl d
    join pg_namespace n on n.oid = d.defaclnamespace
    cross join lateral aclexplode(d.defaclacl) a
    where n.nspname = 'app_private'
      and (
        a.grantee = 0
        or a.grantee in (select oid from pg_roles where rolname in ('anon', 'authenticated'))
      )
  $$,
  'aucun droit par défaut de app_private pour PUBLIC, anon ou authenticated'
);
select is(
  (
    select count(*)::int
    from pg_default_acl d
    cross join lateral aclexplode(d.defaclacl) a
    where d.defaclrole = 'postgres'::regrole
      and d.defaclnamespace = 0
      and d.defaclobjtype = 'f'
      and a.grantee = 0
  ),
  0,
  'le défaut global de postgres n''accorde pas EXECUTE à PUBLIC'
);
select isnt(
  (
    select d.defaclacl
    from pg_default_acl d
    where d.defaclrole = 'postgres'::regrole
      and d.defaclnamespace = 0
      and d.defaclobjtype = 'f'
  ),
  null,
  'le défaut intégré de PostgreSQL (EXECUTE à PUBLIC) est remplacé pour postgres'
);

-- 4. Objets créés après coup, comme le fera une migration (rôle postgres),
--    sans aucun GRANT ni REVOKE explicite : ni anon ni authenticated n'y ont
--    accès.
create function app_private.test_aide() returns int
  language sql stable as $f$ select 1 $f$;
create table app_private.test_table (id int);

select ok(
  not has_function_privilege('anon', 'app_private.test_aide()', 'EXECUTE')
  and not has_function_privilege('authenticated', 'app_private.test_aide()', 'EXECUTE'),
  'une nouvelle fonction de app_private n''est exécutable ni par anon ni par authenticated'
);
select ok(
  not has_table_privilege('anon', 'app_private.test_table', 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER')
  and not has_table_privilege('authenticated', 'app_private.test_table', 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER'),
  'une nouvelle table de app_private n''est accessible ni à anon ni à authenticated'
);

-- 5. Vérification par l'usage.
set local role anon;
select throws_ok(
  'select app_private.test_aide()',
  '42501',
  null,
  'anon ne peut pas appeler une fonction de app_private'
);
select throws_ok(
  'create table app_private.intrusion (id int)',
  '42501',
  null,
  'anon ne peut pas créer de table dans app_private'
);
reset role;

set local role authenticated;
select throws_ok(
  'select app_private.test_aide()',
  '42501',
  null,
  'authenticated ne peut pas appeler une fonction de app_private sans GRANT explicite'
);
select throws_ok(
  'select * from app_private.test_table',
  '42501',
  null,
  'authenticated ne peut pas lire une table de app_private'
);
select throws_ok(
  'create function app_private.intrusion() returns int language sql as $f$ select 1 $f$',
  '42501',
  null,
  'authenticated ne peut pas créer de fonction dans app_private'
);
reset role;

-- Un GRANT explicite, fonction par fonction, suffit (modèle des aides RLS en
-- S1) : USAGE sur le schéma est déjà accordé.
grant execute on function app_private.test_aide() to authenticated;
set local role authenticated;
select is(app_private.test_aide(), 1, 'un GRANT EXECUTE explicite rend la fonction appelable par authenticated');
reset role;

-- 6. Schéma non exposé par l'API. La liste des schémas exposés est passée à
--    PostgREST par supabase/config.toml ([api].schemas, vérifié par
--    scripts/lib/supabase-config.test.ts) ; elle peut aussi l'être en base, par
--    le réglage pgrst.db_schemas du rôle authenticator. Ce réglage ne doit pas
--    citer app_private.
select is_empty(
  $$
    select s.setconfig
    from pg_db_role_setting s
    cross join lateral unnest(s.setconfig) as c (setting)
    where c.setting like 'pgrst.db_schemas=%'
      and c.setting like '%app_private%'
  $$,
  'app_private n''est pas dans pgrst.db_schemas'
);

select * from finish();

rollback;
