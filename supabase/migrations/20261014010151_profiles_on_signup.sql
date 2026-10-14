-- Création automatique du profil à l'inscription (ADR 0007).
-- SECURITY DEFINER : l'insertion dans auth.users est faite par GoTrue
-- (supabase_auth_admin), sans droit sur public.profiles. search_path vide,
-- noms qualifiés. Aucun GRANT : une fonction de trigger n'est pas appelée
-- directement, et EXECUTE n'est vérifié qu'à la création du trigger.
-- Les métadonnées viennent de l'utilisateur (inscription) : seules full_name
-- (tronqué) et une langue valide sont reprises.

create function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, preferred_locale)
  values (
    new.id,
    pg_catalog.left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 200),
    case
      when new.raw_user_meta_data ->> 'preferred_locale' in ('fr', 'ar')
        then new.raw_user_meta_data ->> 'preferred_locale'
      else 'fr'
    end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app_private.handle_new_user();
