-- Modèle de droits de app_private (ADR 0006), qui remplace « aucun accès » :
--   - le schéma n'est jamais exposé par l'API (absent de [api].schemas) ;
--   - anon : aucun droit ; authenticated : USAGE seulement, pour que les
--     politiques RLS, évaluées avec ses droits, puissent appeler les aides de
--     ce schéma ;
--   - aucune fonction ni table n'est accessible par défaut : chaque fonction
--     utilisée par une politique RLS recevra un GRANT EXECUTE explicite à
--     authenticated, fonction par fonction.

grant usage on schema app_private to authenticated;

comment on schema app_private is
  'Fonctions internes (SECURITY DEFINER). Non exposé par l''API. USAGE pour authenticated seulement ; EXECUTE accordé fonction par fonction.';

-- PostgreSQL accorde EXECUTE à PUBLIC sur toute nouvelle fonction. Ce droit
-- intégré est un défaut global : un ALTER DEFAULT PRIVILEGES limité à un
-- schéma ne peut pas le retirer (les défauts par schéma s'ajoutent aux défauts
-- globaux). On le retire donc globalement, pour les objets créés par postgres
-- (rôle des migrations). Sans effet sur public : Supabase y accorde EXECUTE
-- explicitement à anon, authenticated et service_role par un défaut propre à
-- ce schéma, qui s'applique toujours.
alter default privileges for role postgres
  revoke execute on functions from public;

-- Défauts propres au schéma : aucun droit sur les fonctions ni les tables
-- pour anon et authenticated. Rien ne leur en accorde aujourd'hui ; ces
-- instructions documentent l'intention et neutralisent un futur octroi.
alter default privileges for role postgres in schema app_private
  revoke execute on functions from public, anon, authenticated;
alter default privileges for role postgres in schema app_private
  revoke all on tables from anon, authenticated;
