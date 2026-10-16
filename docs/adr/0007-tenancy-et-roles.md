# ADR 0007 : Tenancy, rôles et RLS

- **Date** : 2026-10-14 (révisée le 2026-10-16 : politiques évaluées une fois par requête)
- **Statut** : Acceptée

## Contexte

La base est partagée entre établissements et isolée par RLS (ADR 0002). Il faut un modèle commun à toutes les tables métier : qui est le tenant, comment un utilisateur y est rattaché, avec quel rôle, et comment les politiques RLS le vérifient sans fuite entre établissements ni élévation de droits. Rôles métier : direction, caisse, enseignant, parent. Une même personne peut en cumuler plusieurs (un directeur qui tient la caisse, un enseignant parent d'élève).

## Options

- **Rattachement** : un rôle unique par utilisateur (colonne sur le profil) ; un rôle par établissement ; plusieurs rôles par établissement (une ligne par rôle).
- **Où vérifier l'appartenance** : sous-requête sur `memberships` dans chaque politique ; claims personnalisés dans le JWT (hook d'authentification) ; fonctions d'aide SQL.
- **Champs modifiables** : RLS seule ; RLS et droits par colonne ; vues ou fonctions dédiées aux mises à jour.

## Décision

1. **L'établissement est le tenant.** Table `public.schools` (`type` : `ecole` | `centre`, `default_locale` `fr` | `ar`, `timezone` `Africa/Casablanca` par défaut). Son `id` sert de `school_id` dans toutes les tables métier.
2. **Rôles attribués par établissement, cumulables.** Table `public.memberships` (`school_id`, `user_id`, `role` de type `app_role`), unique sur `(school_id, user_id, role)`. Un utilisateur peut appartenir à plusieurs établissements et y avoir plusieurs rôles. `public.profiles` (1-1 avec `auth.users`) ne contient que `full_name` et `preferred_locale`.
3. **Fonctions d'aide dans `app_private`** (ADR 0006), `SECURITY DEFINER`, `STABLE`, `search_path = ''`, noms qualifiés, EXECUTE accordé à `authenticated` seul :
   - `user_school_ids()` : établissements de l'utilisateur courant ;
   - `user_school_ids_with_roles(roles[])` : établissements où l'utilisateur courant a l'un de ces rôles ;
   - `has_role(school_id, roles[])` : l'utilisateur courant a-t-il l'un de ces rôles dans cet établissement. Réservée aux vérifications ponctuelles (côté serveur, sur un établissement donné), **jamais dans une politique**.
     `SECURITY DEFINER` (propriétaire `postgres`, BYPASSRLS) évite qu'une politique de `memberships` se rappelle elle-même. Elles ne renvoient que ce qui concerne `auth.uid()`. Aucune fonction `SECURITY DEFINER` dans `public` (exposé par l'API).
   - **Forme des politiques** : toujours `colonne in (select fonction_ensemble(...))` et `(select auth.uid())`, jamais une fonction dont un argument dépend de la ligne. Exemple : `school_id in (select app_private.user_school_ids_with_roles('{direction}'))`. La sous-requête n'est pas corrélée : Postgres l'évalue une seule fois (InitPlan ou `hashed SubPlan`) puis compare par hachage. `has_role(school_id, ...)` dans une politique était évaluée à chaque ligne. Mesure sur 1 000 memberships (10 établissements), en tant que direction : `select * from memberships` passe de 999 appels de `has_role` et 7,9 ms à 1 appel et 0,5 ms ; `select * from profiles` de 1 099 appels et 9,6 ms à 2 appels et 0,64 ms. Un test pgTAP refuse toute politique de `public` qui appelle `has_role(`.
4. **RLS pour les lignes, droits par colonne pour les champs.** La RLS filtre des lignes, pas des colonnes. Sur chaque table : `revoke all` à `anon` et `authenticated` (Supabase leur accorde tout par défaut dans `public`), puis `grant select` à `authenticated` et `grant update (colonnes)` pour les seuls champs modifiables. Une opération non prévue échoue deux fois : par l'absence de droit (erreur 42501), et par l'absence de politique. Une politique par opération autorisée, toujours `to authenticated`, jamais `using (true)`. `updated_at` est maintenu par trigger (`app_private.set_updated_at`).
5. **Droits actuels** :
   - `schools` : lecture par les membres ; mise à jour de `name` et `default_locale` par la direction.
   - `memberships` : lecture de ses propres lignes, et de toutes celles de l'établissement pour la direction ; aucune écriture.
   - `profiles` : lecture du sien, et de ceux des membres de ses établissements pour la direction ; mise à jour de son `full_name` et de sa `preferred_locale`.
   - `anon` : rien.
6. **Création des établissements réservée à la plateforme** : aucune politique d'insertion ; un script serveur avec `service_role` les créera (plus tard). Pas de rôle super-administrateur dans l'application. Les appartenances seront écrites côté serveur par le flux d'invitation (S1-c).
7. **Profil créé à l'inscription** par un trigger sur `auth.users` (`app_private.handle_new_user`, `SECURITY DEFINER`), qui ne reprend des métadonnées d'inscription (fournies par l'utilisateur) qu'un nom tronqué et une langue valide.
8. **Authentification des parents reportée à S7** (espace parent). D'ici là, les parents n'interagissent que par WhatsApp. S1-b couvre la connexion du personnel (ADR 0008).
   - **Une direction peut nommer une autre direction** dans son établissement (mis en œuvre en S1-c, avec les invitations).
   - **Le retrait de la dernière direction d'un établissement est interdit en base** (contrainte ou trigger, mis en œuvre en S1-c) : un établissement n'est jamais sans direction.
9. **Tests pgTAP de l'isolation** : `supabase/tests/helpers/auth.psql` (création d'utilisateurs fictifs, `tests.authenticate_as`, `tests.authenticate_as_anon`, `tests.affected_rows`) et `helpers/tenancy_fixtures.psql` (établissements A et B, un utilisateur par rôle dans A, une direction dans B, un utilisateur direction + caisse dans A), inclus par `\ir`. Chaque table métier a son fichier de test : lecture limitée à son établissement pour chaque rôle, `0 ligne` pour une mise à jour hors périmètre, `42501` pour une écriture ou une colonne non autorisée, rien pour `anon`, et garde-fous structurels (RLS activée, liste exacte des politiques, aucune politique `true`). Modèle : `supabase/tests/tenancy_isolation.test.sql`.

Alternatives écartées : rôle unique par utilisateur (ne couvre ni plusieurs établissements, ni le cumul) ; une seule ligne par établissement avec un tableau de rôles (contrainte d'unicité et requêtes plus fragiles) ; claims de rôle dans le JWT (plus rapide, mais périmés jusqu'au rafraîchissement du jeton après un changement de rôle, et dépend d'un hook d'auth ; à reconsidérer si les performances l'exigent) ; sous-requêtes directes dans les politiques (récursion RLS sur `memberships`, logique dupliquée) ; RLS seule (un membre pourrait modifier `type` ou `timezone`) ; vues ou fonctions de mise à jour (plus de code à sécuriser pour le même résultat).

## Conséquences

- Toute nouvelle table métier : `school_id` non nul, clé étrangère vers `schools` (`on delete cascade` sauf raison contraire) et index ; RLS activée dans la même migration ; politiques de la forme `school_id in (select app_private.user_school_ids())` ou `school_id in (select app_private.user_school_ids_with_roles('{...}'))` ; `revoke all` puis droits par colonne ; fichier pgTAP sur les deux établissements du jeu de test.
- Une nouvelle fonction d'aide RLS est ajoutée à la liste autorisée du test `app_private_privileges`, avec sa justification dans sa migration.
- Un changement de rôle prend effet immédiatement (lu en base à chaque requête), au prix d'une lecture de `memberships` par requête (et non par ligne), couverte par l'index `(user_id, school_id)`.
- Une nouvelle fonction d'aide RLS est une fonction d'ensemble sans argument lié à la ligne ; elle est ajoutée aux listes d'inventaire des tests `app_private_privileges` et `tenancy_functions`.
- La suppression d'un utilisateur dans `auth.users` supprime son profil et ses appartenances. La suppression d'un établissement supprime ses appartenances (et, plus tard, ses données métier).
- L'inscription réelle par GoTrue (`supabase_auth_admin`) n'est pas simulable en pgTAP local : à vérifier de bout en bout en S1-b.
