# LMS Maroc

Socle technique d'un SaaS multi-établissement pour les écoles privées et les centres de soutien marocains : vie scolaire, paiements avec relances, communication WhatsApp traduite (FR/AR/darija). Interfaces en français et en arabe (RTL) ; PWA pour les parents, application web pour la direction.

État actuel : socle et internationalisation FR/AR (RTL). La page d'accueil est un placeholder traduit ; Supabase local avec migrations réversibles et tests pgTAP, sans aucune table métier ; ni fonctionnalité métier, ni authentification.

## Prérequis

- Node.js 24 LTS : version de référence dans `.nvmrc` (24.21.0), toute 24.x à partir de 24.11 acceptée (`engines`).
- pnpm 12.9.1 (fixé par `packageManager`). npm et yarn ne doivent pas être utilisés.
- Docker Desktop récent avec le backend WSL2 (Windows) ou Docker Engine (Linux), pour la base Supabase locale. Une version ancienne de Docker Desktop (ex. 4.23 de 2023) ne démarre plus son moteur avec les WSL récents : la mettre à jour (`winget upgrade --id Docker.DockerDesktop`). La Supabase CLI est installée par `pnpm install`.

Installation de pnpm :

```sh
npm install -g pnpm@12.9.1
```

> Corepack 0.34 (livré avec Node 24.11) ne sait pas lancer pnpm 12 (il cherche `bin/pnpm.cjs`, pnpm 12 fournit `bin/pnpm.mjs`). À défaut d'installation globale, `npx pnpm@12.9.1 <commande>` fonctionne.

## Démarrage

```sh
pnpm install
cp .env.example .env.local   # PowerShell : Copy-Item .env.example .env.local
pnpm db:start                # premier lancement : plusieurs Go d'images à télécharger
pnpm dev
```

Application disponible sur http://localhost:3000, qui redirige vers `/fr` ou `/ar` selon la langue du navigateur (français par défaut).

Le build télécharge les polices (IBM Plex Sans et IBM Plex Sans Arabic) depuis Google Fonts via `next/font` : il nécessite un accès réseau.

Variables d'environnement : voir `.env.example`, à copier vers `.env.local` (obligatoire : les variables Supabase sont requises). Ses valeurs Supabase sont les clés locales par défaut de la CLI, sans valeur hors du poste. Elles sont validées par zod dans `src/env.ts` au démarrage : une variable invalide arrête `next dev` et `next build`.

## Commandes

| Commande          | Rôle                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`        | Serveur de développement                                                                                      |
| `pnpm build`      | Build de production, puis `check:bundle` : échoue si la clé service_role est dans `.next/static`              |
| `pnpm lint`       | `pnpm i18n:check`, `pnpm db:check-rollbacks`, ESLint (règles Next.js et règle RTL) puis vérification Prettier |
| `pnpm i18n:check` | Vérifie que `messages/fr.json` et `messages/ar.json` ont les mêmes clés, sans valeur vide                     |
| `pnpm format`     | Reformate tout le dépôt avec Prettier                                                                         |
| `pnpm typecheck`  | Génère les types Next (`next typegen`) puis `tsc --noEmit`                                                    |
| `pnpm test`       | Tests unitaires Vitest                                                                                        |
| `pnpm test:e2e`   | Tests e2e Playwright (lance `next dev` automatiquement)                                                       |

### Base de données (Docker requis, sauf `db:new` et `db:check-rollbacks`)

| Commande                    | Rôle                                                                                                                              |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm db:start` / `db:stop` | Démarre / arrête Supabase local (API sur http://127.0.0.1:54321, Studio sur http://127.0.0.1:54323)                               |
| `pnpm db:reset`             | Recrée la base locale et applique toutes les migrations                                                                           |
| `pnpm db:new <nom>`         | Crée `supabase/migrations/<horodatage>_<nom>.sql` et son rollback vide `supabase/rollbacks/<horodatage>_<nom>.down.sql`           |
| `pnpm db:types`             | Régénère `src/lib/supabase/database.types.ts` (à commiter après chaque migration)                                                 |
| `pnpm db:test`              | Tests pgTAP de `supabase/tests`                                                                                                   |
| `pnpm db:rollback-check`    | Base vide → migrations → rollbacks en ordre inverse → migrations ; échoue au premier écart de schéma. Efface les données locales. |
| `pnpm db:check-rollbacks`   | Vérifie que chaque migration a son rollback (sans Docker, lancé par `pnpm lint`)                                                  |

Avant le premier `pnpm test:e2e` : `pnpm exec playwright install chromium`.

La CI GitHub Actions (`.github/workflows/ci.yml`) exécute à chaque push et pull request : install, lint, typecheck, test, build ; les tests e2e dans un job séparé ; et un job `db` (Supabase local, `db:rollback-check`, `db:test`, types à jour).

## Structure

```
src/
  app/[locale]/        routes Next.js (App Router) préfixées par la langue (/fr, /ar)
  features/<domaine>/  code métier par domaine : students, attendance, grades, billing, messaging
  lib/                 utilitaires transverses (lib/i18n : routage, polices, formatage)
  components/ui/       composants d'interface génériques
  lib/supabase/        clients Supabase typés (navigateur, serveur, service_role) et types générés
  env.ts               validation des variables d'environnement (zod)
  proxy.ts             redirection de / vers /fr ou /ar (next-intl)
messages/              textes de l'interface : fr.json, ar.json
scripts/               scripts Node du dépôt (i18n:check, db:*, check:bundle)
supabase/config.toml   configuration de Supabase local
supabase/migrations/   migrations SQL
supabase/rollbacks/    retour arrière de chaque migration
supabase/tests/        tests pgTAP (droits, RLS)
docs/adr/              fiches de décision d'architecture
e2e/                   tests Playwright
```

Les tests unitaires sont placés à côté du code testé (`*.test.ts`).

## Conventions

- TypeScript strict, y compris `noUncheckedIndexedAccess`.
- RTL : classes Tailwind logiques uniquement (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `text-start`, `text-end`). `pnpm lint` refuse `ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`, `text-left`, `text-right`, `border-l/r`, `rounded-l/r/tl/tr/bl/br`, `float-left/right`, `clear-left/right`, `scroll-ml/mr/pl/pr`, y compris avec variantes (`md:ml-4`), et `pnpm exec eslint --fix .` les convertit.
- Toute table métier porte `school_id`, isolée par RLS Postgres et testée par pgTAP. Toute migration a son rollback. Le client service_role est réservé aux tâches système.
- Aucun secret ni donnée réelle d'enfant dans le dépôt.
- Tout texte visible passe par `messages/fr.json` et `messages/ar.json` (next-intl). Dates, nombres et montants en MAD via `src/lib/i18n/format.ts`, avec chiffres latins en arabe.

Le détail est dans [CLAUDE.md](CLAUDE.md).

## Décisions d'architecture

- [0001 : stack technique](docs/adr/0001-stack.md)
- [0002 : modèle multi-établissement](docs/adr/0002-multi-etablissement.md)
- [0003 : hébergement des données et CNDP](docs/adr/0003-hebergement-donnees.md)
- [0004 : hébergement du frontend](docs/adr/0004-hebergement-front.md)
- [0005 : internationalisation](docs/adr/0005-i18n.md)
- [0006 : base de données locale, migrations réversibles, tests SQL](docs/adr/0006-base-de-donnees.md)
