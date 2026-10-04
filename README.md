# LMS Maroc

Socle technique d'un SaaS multi-établissement pour les écoles privées et les centres de soutien marocains : vie scolaire, paiements avec relances, communication WhatsApp traduite (FR/AR/darija). Interfaces en français et en arabe (RTL) ; PWA pour les parents, application web pour la direction.

État actuel : socle uniquement. La page d'accueil est un placeholder ; aucune fonctionnalité métier, ni Supabase, ni i18n, ni authentification.

## Prérequis

- Node.js 24 LTS : version de référence dans `.nvmrc` (24.21.0), toute 24.x à partir de 24.11 acceptée (`engines`).
- pnpm 12.9.1 (fixé par `packageManager`). npm et yarn ne doivent pas être utilisés.

Installation de pnpm :

```sh
npm install -g pnpm@12.9.1
```

> Corepack 0.34 (livré avec Node 24.11) ne sait pas lancer pnpm 12 (il cherche `bin/pnpm.cjs`, pnpm 12 fournit `bin/pnpm.mjs`). À défaut d'installation globale, `npx pnpm@12.9.1 <commande>` fonctionne.

## Démarrage

```sh
pnpm install
pnpm dev
```

Application disponible sur http://localhost:3000.

Variables d'environnement : voir `.env.example`, à copier vers `.env.local` si besoin. Elles sont validées par zod dans `src/env.ts` au démarrage : une variable invalide arrête `next dev` et `next build`.

## Commandes

| Commande         | Rôle                                                            |
| ---------------- | --------------------------------------------------------------- |
| `pnpm dev`       | Serveur de développement                                        |
| `pnpm build`     | Build de production                                             |
| `pnpm lint`      | ESLint (règles Next.js et règle RTL) puis vérification Prettier |
| `pnpm format`    | Reformate tout le dépôt avec Prettier                           |
| `pnpm typecheck` | Génère les types Next (`next typegen`) puis `tsc --noEmit`      |
| `pnpm test`      | Tests unitaires Vitest                                          |
| `pnpm test:e2e`  | Tests e2e Playwright (lance `next dev` automatiquement)         |

Avant le premier `pnpm test:e2e` : `pnpm exec playwright install chromium`.

La CI GitHub Actions (`.github/workflows/ci.yml`) exécute à chaque push et pull request : install, lint, typecheck, test, build, puis les tests e2e dans un job séparé.

## Structure

```
src/
  app/                 routes Next.js (App Router), layouts, styles globaux
  features/<domaine>/  code métier par domaine : students, attendance, grades, billing, messaging
  lib/                 utilitaires transverses
  components/ui/       composants d'interface génériques
  env.ts               validation des variables d'environnement (zod)
supabase/migrations/   migrations SQL (vide pour l'instant)
docs/adr/              fiches de décision d'architecture
e2e/                   tests Playwright
```

Les tests unitaires sont placés à côté du code testé (`*.test.ts`).

## Conventions

- TypeScript strict, y compris `noUncheckedIndexedAccess`.
- RTL : classes Tailwind logiques uniquement (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `text-start`, `text-end`). `pnpm lint` refuse `ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`, `text-left`, `text-right`, y compris avec variantes (`md:ml-4`), et `pnpm exec eslint --fix .` les convertit.
- Toute table métier porte `school_id`, isolée par RLS Postgres.
- Aucun secret ni donnée réelle d'enfant dans le dépôt.
- Tout texte visible traduit en français et en arabe.

Le détail est dans [CLAUDE.md](CLAUDE.md).

## Décisions d'architecture

- [0001 : stack technique](docs/adr/0001-stack.md)
- [0002 : modèle multi-établissement](docs/adr/0002-multi-etablissement.md)
- [0003 : hébergement des données et CNDP](docs/adr/0003-hebergement-donnees.md)
- [0004 : hébergement du frontend](docs/adr/0004-hebergement-front.md)
