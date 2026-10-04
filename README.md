# LMS Maroc

Socle technique d’un SaaS multi-établissement destiné aux écoles privées et centres de soutien marocains. La page d’accueil est un placeholder ; aucune fonctionnalité métier n’est incluse.

## Prérequis et démarrage

- Node.js 24 LTS (version locale fixée dans `.nvmrc`)
- pnpm 12.9.1, activable avec `corepack prepare pnpm@12.9.1 --activate`

```sh
pnpm install
pnpm dev
```

Le serveur de développement est disponible sur `http://localhost:3000`. Les variables sont documentées dans `.env.example` ; pour les personnaliser localement, copiez ce fichier vers `.env.local`.

## Vérifications

```sh
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm exec playwright install chromium
pnpm test:e2e
pnpm build
```

## Structure

- `src/app` : routes Next.js App Router et styles globaux
- `src/features/<domaine>` : code métier isolé par domaine ; les dossiers `students`, `attendance`, `grades`, `billing` et `messaging` sont réservés
- `src/lib` : utilitaires transverses
- `src/components/ui` : composants génériques d’interface
- `supabase/migrations` : migrations SQL versionnées
- `docs/adr` : fiches de décision d’architecture
- `e2e` : tests Playwright ; tests unitaires près du code sous `src`

## Conventions importantes

- TypeScript strict, avec `noUncheckedIndexedAccess`.
- Les interfaces doivent employer les utilitaires Tailwind logiques (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `text-start`, `text-end`) plutôt que des directions physiques. `pnpm lint` vérifie cette contrainte.
- Toute table métier porte `school_id` et son accès est isolé par RLS Postgres.
- Aucun secret ou donnée réelle d’enfant dans le dépôt. Voir les ADR pour les conditions d’hébergement et de transfert.
- Toute nouvelle chaîne visible doit être traduite en français et arabe ; l’infrastructure i18n est hors périmètre de ce socle.

## Décisions

Les choix et contraintes sont consignés dans `docs/adr/0001-stack.md` à `docs/adr/0004-hebergement-front.md`.
