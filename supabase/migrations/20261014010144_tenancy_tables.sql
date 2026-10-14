-- Tenancy (ADR 0007) : établissements, profils, appartenances avec rôle.
-- L'établissement (schools) est le tenant : son id sert de school_id dans
-- toutes les tables métier. La RLS est activée ici, sans politique (donc tout
-- refusé) ; les politiques viennent avec les fonctions d'aide
-- (migration tenancy_policies).

create type public.school_type as enum ('ecole', 'centre');
create type public.app_role as enum ('direction', 'caisse', 'enseignant', 'parent');

-- Maintient updated_at côté base : le client n'a aucun droit sur la colonne.
-- Fonction de trigger, non SECURITY DEFINER : aucun GRANT nécessaire (les
-- droits EXECUTE ne sont vérifiés qu'à la création du trigger).
create function app_private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

-- --- schools ----------------------------------------------------------------

create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200),
  type public.school_type not null,
  default_locale text not null default 'fr' check (default_locale in ('fr', 'ar')),
  timezone text not null default 'Africa/Casablanca',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.schools is
  'Établissement (tenant). Créé par la plateforme (service_role), jamais par un utilisateur.';

create trigger schools_set_updated_at
  before update on public.schools
  for each row execute function app_private.set_updated_at();

alter table public.schools enable row level security;

-- --- profiles ---------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 200),
  preferred_locale text not null default 'fr' check (preferred_locale in ('fr', 'ar')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Profil d''un utilisateur (1-1 avec auth.users), créé à l''inscription par trigger. Aucune autre donnée personnelle.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function app_private.set_updated_at();

alter table public.profiles enable row level security;

-- --- memberships ------------------------------------------------------------

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  -- Une personne peut cumuler plusieurs rôles dans un établissement. Cet
  -- index unique (school_id en tête) sert aussi les recherches par school_id.
  constraint memberships_school_id_user_id_role_key unique (school_id, user_id, role)
);

comment on table public.memberships is
  'Rôle d''un utilisateur dans un établissement. Écrit par le serveur uniquement (invitations, S1-c).';

-- Recherches des fonctions d'aide RLS : par utilisateur, puis établissement.
create index memberships_user_id_school_id_idx
  on public.memberships (user_id, school_id);

alter table public.memberships enable row level security;

-- --- Droits -----------------------------------------------------------------
-- Supabase accorde par défaut tous les droits sur les tables de public à anon
-- et authenticated. La RLS filtre les lignes, pas les colonnes : on retire
-- tout, puis on accorde SELECT (filtré par la RLS) et UPDATE colonne par
-- colonne. anon n'a rien. service_role garde ses droits (tâches système).

revoke all on table public.schools, public.profiles, public.memberships
  from anon, authenticated;

grant select on table public.schools, public.profiles, public.memberships
  to authenticated;

grant update (name, default_locale) on table public.schools to authenticated;
grant update (full_name, preferred_locale) on table public.profiles to authenticated;
