-- Schéma app_private : réservé aux futures fonctions SECURITY DEFINER (aides
-- pour la RLS, tâches internes). Il n'est pas exposé par l'API (absent de
-- [api].schemas dans supabase/config.toml) et anon, authenticated et PUBLIC
-- n'y ont aucun droit. Aucune table métier ici (ADR 0002, 0006).

create schema app_private;

comment on schema app_private is
  'Fonctions internes (SECURITY DEFINER). Aucun droit pour anon ni authenticated.';

-- Aucun droit d'usage ni de création sur le schéma, y compris via PUBLIC.
-- Sans USAGE, aucun objet du schéma n'est accessible à ces rôles.
revoke all on schema app_private from public, anon, authenticated;

-- Droits par défaut : les droits par défaut de Supabase pour anon et
-- authenticated ne visent que le schéma public, rien à révoquer ici.
-- PostgreSQL accorde en revanche EXECUTE à PUBLIC sur toute nouvelle fonction,
-- et un ALTER DEFAULT PRIVILEGES propre au schéma ne peut pas retirer ce droit
-- intégré. Chaque fonction créée dans app_private doit donc faire :
--   revoke execute on function app_private.<nom>(...) from public, anon, authenticated;
-- supabase/tests/app_private_privileges.test.sql échoue sinon.
