# Conventions du projet

- Routes et layouts dans `src/app` ; métier dans `src/features/<domaine>` ; utilitaires partagés dans `src/lib` ; composants génériques dans `src/components/ui`.
- Domaines prévus : `students`, `attendance`, `grades`, `billing`, `messaging`.
- Commandes : `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`.
- TypeScript strict avec `noUncheckedIndexedAccess` ; vérifier les changements avec lint, typecheck et les tests adaptés.
- Toute interface doit rester compatible RTL : utiliser les classes Tailwind logiques (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `text-start`, `text-end`), jamais `ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`, `text-left` ou `text-right`.
- Chaque table métier doit inclure `school_id` et appliquer l’isolation dans une politique RLS Postgres, pas uniquement dans le code.
- Ne jamais coder en dur de secret, clé, URL privée ou donnée personnelle réelle.
- Les migrations SQL doivent être conçues pour être réversibles.
- Tout texte visible par l’utilisateur doit disposer de traductions françaises et arabes. L’infrastructure i18n sera ajoutée dans une session ultérieure.
- Consulter les ADR dans `docs/adr` avant de modifier une décision structurante.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
