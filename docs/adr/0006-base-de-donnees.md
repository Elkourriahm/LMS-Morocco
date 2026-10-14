# ADR 0006 : Base de données locale, migrations réversibles et tests SQL

- **Date** : 2026-10-09
- **Statut** : Acceptée

## Contexte

La base est partagée entre établissements et isolée par RLS Postgres (ADR 0002), hébergée chez Supabase en région UE (ADR 0003). Une erreur de politique RLS exposerait les données d'un établissement à un autre : l'isolation doit être testée automatiquement, sur une base identique à la production, sans toucher à un environnement partagé. Supabase n'applique que des migrations montantes : il n'existe pas de migration descendante native.

## Options

- **Base de développement** : Supabase local via la CLI (Docker) ; projet Supabase distant de développement ; Postgres seul en Docker.
- **Retour arrière** : fichier de rollback écrit à la main pour chaque migration ; outil de migration tiers gérant up/down (dbmate, Flyway, node-pg-migrate) ; pas de rollback, correction par migration suivante uniquement ; restauration de sauvegarde.
- **Tests de la RLS** : pgTAP (`supabase test db`) ; tests d'intégration en TypeScript via le client Supabase ; vérification manuelle.

## Décision

1. **Supabase local via la CLI** (`supabase` en dépendance de développement, version exacte). Mêmes images que la production (Postgres 17, GoTrue, PostgREST), donc mêmes rôles (`anon`, `authenticated`, `service_role`), mêmes schémas et mêmes droits par défaut. `supabase/config.toml` est versionné. Commandes : `pnpm db:start`, `db:stop`, `db:reset`.
2. **Convention de rollback manuelle.** Chaque `supabase/migrations/<horodatage>_<nom>.sql` a son `supabase/rollbacks/<horodatage>_<nom>.down.sql`, qui l'annule exactement, dans l'ordre inverse. Les rollbacks sont hors de `supabase/migrations` pour que la CLI ne les applique jamais. `pnpm db:new <nom>` crée les deux fichiers.
3. **Vérification à deux niveaux.**
   - `pnpm db:check-rollbacks` (dans `pnpm lint`, sans Docker) : chaque migration a son rollback, aucun rollback orphelin, noms conformes.
   - `pnpm db:rollback-check` (job CI `db`) : base vide → toutes les migrations → tous les rollbacks du plus récent au plus ancien → toutes les migrations à nouveau. Le schéma (`supabase db dump`, droits compris) après les rollbacks doit être identique à la base vide, et identique à la première application après réapplication. Arrêt au premier échec.
4. **pgTAP pour tester les droits et la RLS** (`supabase/tests/*.test.sql`, `pnpm db:test`). Chaque table métier aura un fichier de test d'isolation entre deux établissements (structure décrite dans `supabase/tests/app_private_privileges.test.sql`).
5. **Client service_role** (`src/lib/supabase/admin.ts`, `import 'server-only'`) réservé aux tâches système sans utilisateur : cron, webhooks, scripts. Jamais dans le chemin d'une requête utilisateur, qui passe par `src/lib/supabase/server.ts` (clé anon + session, donc RLS). Garde-fous : règle ESLint `no-restricted-imports` (import autorisé seulement sous `src/app/api/cron`, `src/app/api/webhooks`, `src/features/*/jobs`) ; `src/env.ts` refuse la clé dans une variable `NEXT_PUBLIC_*` ; `pnpm build` échoue si sa valeur apparaît dans `.next/static`.
6. **Types générés** : `pnpm db:types` écrit `src/lib/supabase/database.types.ts` ; les trois clients sont typés avec. La CI échoue si le fichier régénéré diffère du fichier commité.
7. **Schéma `app_private`** (migrations `app_private_schema` puis `app_private_privileges`, révision du 2026-10-14) : il accueille les fonctions internes, dont les aides appelées par les politiques RLS (établissement courant, rôle). Une politique RLS est évaluée avec les droits de l'utilisateur : celui-ci a besoin de USAGE sur le schéma et de EXECUTE sur la fonction. D'où le modèle :
   - jamais exposé par l'API : absent de `[api].schemas` et de `extra_search_path` dans `supabase/config.toml` (vérifié par `scripts/lib/supabase-config.test.ts`), absent de `pgrst.db_schemas` en base (pgTAP) ;
   - `anon` : aucun droit sur le schéma ; `authenticated` : USAGE seulement (ni CREATE, ni droit sur les objets) ;
   - aucune fonction ni table accessible par défaut : `ALTER DEFAULT PRIVILEGES` propres au schéma qui révoquent EXECUTE sur les fonctions (PUBLIC, anon, authenticated) et tout droit sur les tables (anon, authenticated). PostgreSQL accorde EXECUTE à PUBLIC sur toute nouvelle fonction par un défaut **global**, qu'un défaut propre à un schéma ne peut pas retirer (les défauts par schéma s'ajoutent aux défauts globaux). La migration révoque donc aussi ce défaut globalement pour le rôle `postgres`, qui exécute les migrations. Effet sur `public` : aucun, Supabase y accorde EXECUTE explicitement à `anon`, `authenticated` et `service_role` par un défaut propre au schéma ;
   - chaque aide RLS reçoit un `GRANT EXECUTE ... TO authenticated` explicite, fonction par fonction, dans la migration qui la crée (S1). Les autres fonctions restent sans droit.
   - Test pgTAP `supabase/tests/app_private_privileges.test.sql` : anon sans USAGE, authenticated avec USAGE seul, une fonction et une table créées dans le test inaccessibles à anon et authenticated, un GRANT explicite suffisant, schéma non exposé.

Alternatives écartées : projet distant de développement (partagé, payant au-delà du gratuit, tests destructifs impossibles, données hors du poste) ; Postgres seul (sans les rôles, schémas `auth` et droits de Supabase, la RLS testée ne serait pas celle de la production) ; outil de migration tiers (doublonne la CLI Supabase et son historique `supabase_migrations`, complique `db push` vers le projet distant) ; pas de rollback (aucun moyen sûr d'annuler une migration ratée en production) ; tests RLS en TypeScript seuls (plus lents, dépendent de l'API et de l'auth ; à ajouter plus tard en complément pour les parcours bout en bout). Pour `app_private` : aucun droit pour `authenticated` (modèle initial, incompatible avec des aides RLS dans ce schéma) ; un second schéma dédié aux aides RLS (deux schémas privés à maintenir pour le même besoin) ; révocation explicite de EXECUTE dans chaque migration sans défaut global (un oubli rend la fonction appelable par tous, seul le test le rattrape).

## Conséquences

- Docker Desktop (WSL2 sous Windows) est requis pour toute commande `db:*` sauf `db:new` et `db:check-rollbacks`. Le premier `db:start` télécharge plusieurs gigaoctets d'images.
- Un rollback n'est vérifié que structurellement : il restaure le schéma, pas les données. Une migration qui transforme ou supprime des données documente dans son rollback ce qui est perdu ; un retour arrière en production se décide au cas par cas, sauvegarde à l'appui.
- `db:rollback-check` détruit les données de la base locale (reset).
- Défaut global : toute fonction créée par `postgres` n'est plus exécutable par PUBLIC ; seuls les défauts propres à un schéma accordent EXECUTE (Supabase le fait pour `public` et `storage`). Une fonction destinée aux utilisateurs reçoit donc un GRANT explicite. Les objets créés par un autre rôle (`supabase_admin`) ne sont pas couverts : les migrations s'exécutent en `postgres`.
- `authenticated` ayant USAGE sur `app_private`, une fonction `SECURITY DEFINER` à laquelle on accorde EXECUTE s'exécute avec les droits de son propriétaire : elle fixe son `search_path` (`set search_path = ''`) et ne renvoie que ce que la politique RLS doit savoir.
- Formatage des dates et montants côté serveur de préférence (ADR 0005) : les données viendront de Postgres, formatées au rendu serveur.
- Session utilisateur : le rafraîchissement des cookies Supabase dans `src/proxy.ts` (combiné au proxy next-intl) viendra avec l'authentification (S1).
