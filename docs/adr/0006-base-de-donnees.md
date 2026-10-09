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

Alternatives écartées : projet distant de développement (partagé, payant au-delà du gratuit, tests destructifs impossibles, données hors du poste) ; Postgres seul (sans les rôles, schémas `auth` et droits de Supabase, la RLS testée ne serait pas celle de la production) ; outil de migration tiers (doublonne la CLI Supabase et son historique `supabase_migrations`, complique `db push` vers le projet distant) ; pas de rollback (aucun moyen sûr d'annuler une migration ratée en production) ; tests RLS en TypeScript seuls (plus lents, dépendent de l'API et de l'auth ; à ajouter plus tard en complément pour les parcours bout en bout).

## Conséquences

- Docker Desktop (WSL2 sous Windows) est requis pour toute commande `db:*` sauf `db:new` et `db:check-rollbacks`. Le premier `db:start` télécharge plusieurs gigaoctets d'images.
- Un rollback n'est vérifié que structurellement : il restaure le schéma, pas les données. Une migration qui transforme ou supprime des données documente dans son rollback ce qui est perdu ; un retour arrière en production se décide au cas par cas, sauvegarde à l'appui.
- `db:rollback-check` détruit les données de la base locale (reset).
- Schéma `app_private` (première migration) : réservé aux fonctions `SECURITY DEFINER`, non exposé par l'API, sans aucun droit pour `anon`, `authenticated` ni `PUBLIC`. PostgreSQL accorde EXECUTE à PUBLIC sur toute nouvelle fonction et ce droit intégré ne se retire pas par un `ALTER DEFAULT PRIVILEGES` propre au schéma : chaque fonction de `app_private` révoque EXECUTE explicitement, et le test pgTAP échoue sinon.
- **À trancher en S1** : une fonction appelée dans une politique RLS s'exécute avec les droits de l'utilisateur, qui a alors besoin de USAGE sur son schéma et de EXECUTE sur la fonction. Les aides RLS (établissement courant, rôle) iront donc soit dans un autre schéma non exposé avec des droits accordés fonction par fonction, soit dans `app_private` en assouplissant la règle et son test.
- Formatage des dates et montants côté serveur de préférence (ADR 0005) : les données viendront de Postgres, formatées au rendu serveur.
- Session utilisateur : le rafraîchissement des cookies Supabase dans `src/proxy.ts` (combiné au proxy next-intl) viendra avec l'authentification (S1).
