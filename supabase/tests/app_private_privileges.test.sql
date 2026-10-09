-- Droits sur le schéma app_private : anon et authenticated n'ont aucun accès.
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

select plan(8);

select has_schema('app_private', 'le schéma app_private existe');

-- 1. Aucun droit sur le schéma lui-même (USAGE, CREATE), y compris hérité de
--    PUBLIC.
select schema_privs_are(
  'app_private', 'anon', array[]::text[],
  'anon n''a aucun droit sur le schéma app_private'
);
select schema_privs_are(
  'app_private', 'authenticated', array[]::text[],
  'authenticated n''a aucun droit sur le schéma app_private'
);

-- 2. Aucun droit sur les objets du schéma. Vides aujourd'hui, ces requêtes
--    protègent les futures fonctions : chacune doit révoquer explicitement
--    EXECUTE à PUBLIC, anon et authenticated, car PostgreSQL accorde EXECUTE
--    à PUBLIC par défaut, quel que soit le schéma.
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

-- 3. Aucun droit par défaut propre au schéma qui profiterait à PUBLIC, anon
--    ou authenticated sur les objets créés plus tard.
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

-- 4. Vérification par l'usage : ni anon ni authenticated ne peuvent créer un
--    objet dans le schéma.
set local role anon;
select throws_ok(
  'create table app_private.intrusion (id int)',
  '42501',
  null,
  'anon ne peut pas créer de table dans app_private'
);
reset role;

set local role authenticated;
select throws_ok(
  'create function app_private.intrusion() returns int language sql as $f$ select 1 $f$',
  '42501',
  null,
  'authenticated ne peut pas créer de fonction dans app_private'
);
reset role;

select * from finish();

rollback;
