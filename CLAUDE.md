# Conventions du projet

SaaS multi-établissement (écoles privées et centres de soutien marocains). Stack : Next.js App Router, TypeScript strict, Supabase, Tailwind CSS 4. Lire les ADR de `docs/adr` avant de modifier une décision structurante.

État du projet, feuille de route, historique des sessions et points ouverts : @docs/contexte.md. Le mettre à jour à la fin de chaque session (historique, statut des stories, points ouverts).

## Structure

- `src/app` : routes, layouts, styles globaux. Pas de logique métier ici. Toutes les pages vivent sous `src/app/[locale]` (layout racine).
- `src/features/<domaine>` : code métier par domaine (`students`, `attendance`, `grades`, `billing`, `messaging`). Un domaine n'importe pas les internes d'un autre.
- `src/lib` : utilitaires transverses, sans dépendance à un domaine. `src/lib/i18n` : routage next-intl, navigation, polices, formatage.
- `messages/fr.json`, `messages/ar.json` : textes de l'interface. `src/proxy.ts` : redirection de `/` selon la langue (ex-middleware, Next.js 16).
- `src/components/ui` : composants d'interface génériques.
- `src/env.ts` : seul point d'accès aux variables d'environnement (validées par zod). Ne pas lire `process.env` ailleurs.
- `supabase/migrations` : migrations SQL.
- `docs/adr` : fiches de décision. `e2e` : tests Playwright. Tests unitaires à côté du code (`*.test.ts`).

## Commandes (pnpm uniquement, jamais npm ni yarn)

- `pnpm install`, `pnpm dev`, `pnpm build`
- `pnpm lint` : `pnpm i18n:check` (parité des clés FR/AR, valeurs non vides), ESLint (dont la règle RTL) puis `prettier --check`. `pnpm exec eslint --fix .` corrige les classes RTL ; `pnpm format` reformate.
- `pnpm typecheck` : `next typegen` puis `tsc --noEmit`
- `pnpm test` (Vitest), `pnpm test:e2e` (Playwright)
- Avant de rendre la main : `pnpm lint && pnpm typecheck && pnpm test && pnpm build`. La CI (`.github/workflows/ci.yml`) exécute les mêmes commandes.

## Règles

- **TypeScript strict** avec `noUncheckedIndexedAccess` : pas de `any`, pas de `!` pour contourner un accès indexé.
- **RTL** : classes Tailwind logiques uniquement : `ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `text-start`, `text-end`, `border-s`, `border-e`, `rounded-s`, `rounded-e`, `rounded-ss`, `rounded-se`, `rounded-es`, `rounded-ee`, `float-start`, `float-end`, `clear-start`, `clear-end`, `scroll-ms`, `scroll-me`, `scroll-ps`, `scroll-pe`. Leurs équivalents physiques (`ml-`, `left-`, `text-left`, `border-l`, `rounded-tl`, `float-left`, `scroll-ml`…) sont refusés par ESLint dans les `className` et les appels `cn`/`clsx` ; non vérifié dans les `@apply` CSS ni les classes construites dynamiquement, à éviter.
- **Multi-établissement** : toute table métier porte `school_id` (non nul, avec clé étrangère) et une politique RLS Postgres qui isole par établissement. Le filtrage dans le code ne remplace jamais la RLS. Chaque migration qui crée une table active la RLS dans la même migration.
- **Migrations réversibles** : chaque migration s'accompagne de son retour arrière documenté et testé. Ne jamais modifier une migration déjà appliquée : en ajouter une nouvelle.
- **Secrets** : aucun secret, clé, URL réelle ou donnée personnelle en dur. Nouvelle variable = schéma dans `src/env.ts` + entrée commentée dans `.env.example`. Les variables `NEXT_PUBLIC_*` sont publiques : jamais de secret dedans.
- **Données réelles** : aucune donnée réelle d'enfant avant l'autorisation CNDP et le consentement des parents (ADR 0003). Données fictives uniquement.
- **Traductions** (ADR 0005) : tout texte visible passe par `messages/fr.json` et `messages/ar.json` (`useTranslations` / `getTranslations` de next-intl) ; aucun texte en dur dans les composants, y compris `aria-label`, `title`, `alt` et métadonnées. Ajouter chaque clé dans les deux fichiers. Interface en FR et AR seulement, pas de darija. Liens internes via `Link` de `@/lib/i18n/navigation`, pas `next/link`.
- **Formatage** : dates, nombres et montants (MAD) uniquement via `src/lib/i18n/format.ts` (chiffres latins en arabe, fuseau `Africa/Casablanca`). Pas de `toLocaleString` ni de `Intl` direct ailleurs.
- **Déploiement** : cible Cloudflare Workers via OpenNext (ADR 0004). Vérifier la compatibilité de toute fonctionnalité Next.js ou API Node utilisée.
- **Dépendances** : versions exactes (`pnpm add -E`). Ne pas contourner la politique de délai minimal de publication de pnpm (`minimumReleaseAgeExclude`) sans le signaler.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
