# Conventions du projet

SaaS multi-établissement (écoles privées et centres de soutien marocains). Stack : Next.js App Router, TypeScript strict, Supabase, Tailwind CSS 4. Lire les ADR de `docs/adr` avant de modifier une décision structurante.

État d'avancement du projet (fait, en cours, prochaine étape), feuille de route, historique des sessions et points ouverts : @docs/contexte.md.

- À la fin de chaque session, mettre à jour docs/contexte.md (fait, en cours, prochaine étape, points ouverts) dans le dernier commit.
- Au début de chaque session, le lire avec git status et git log.

## Structure

- `src/app` : routes, layouts, styles globaux. Pas de logique métier ici. Toutes les pages vivent sous `src/app/[locale]` (layout racine).
- `src/features/<domaine>` : code métier par domaine (`students`, `attendance`, `grades`, `billing`, `messaging`). Un domaine n'importe pas les internes d'un autre.
- `src/lib` : utilitaires transverses, sans dépendance à un domaine. `src/lib/i18n` : routage next-intl, navigation, polices, formatage.
- `messages/fr.json`, `messages/ar.json` : textes de l'interface. `src/proxy.ts` : redirection de `/` selon la langue (ex-middleware, Next.js 16).
- `src/components/ui` : composants d'interface génériques.
- `src/env.ts` : seul point d'accès aux variables d'environnement (validées par zod). Ne pas lire `process.env` ailleurs.
- `supabase/migrations` : migrations SQL ; `supabase/rollbacks` : leur retour arrière (`<horodatage>_<nom>.down.sql`) ; `supabase/tests` : tests pgTAP. `supabase/config.toml` : Supabase local (ADR 0006).
- `src/lib/supabase` : clients typés (`client.ts` navigateur, `server.ts` serveur avec session, `admin.ts` service_role) et `database.types.ts` (généré, ne pas modifier à la main).
- `scripts` : scripts Node du dépôt (`*.mts`, exécutés sans compilation).
- `docs/adr` : fiches de décision. `e2e` : tests Playwright. Tests unitaires à côté du code (`*.test.ts`).

## Commandes (pnpm uniquement, jamais npm ni yarn)

- `pnpm install`, `pnpm dev`, `pnpm build`
- `pnpm lint` : `pnpm i18n:check` (parité des clés FR/AR, valeurs non vides), ESLint (dont la règle RTL) puis `prettier --check`. `pnpm exec eslint --fix .` corrige les classes RTL ; `pnpm format` reformate.
- `pnpm typecheck` : `next typegen` puis `tsc --noEmit`
- `pnpm test` (Vitest, unitaires), `pnpm test:integration` (Vitest, Supabase local requis : `*.int.test.ts`), `pnpm test:e2e` (Playwright sur un build de production ; Supabase local et `pnpm db:seed-dev` requis). `pnpm build` lance ensuite `check:bundle` (clé service_role absente de `.next/static`).
- Base locale (Docker requis) : `pnpm db:start`, `db:stop`, `db:reset`, `db:new <nom>` (migration + rollback), `db:types`, `db:test` (pgTAP), `db:rollback-check`, `db:seed-dev` (comptes fictifs, base locale uniquement). `pnpm lint` lance aussi `db:check-rollbacks`. Emails locaux : Mailpit, http://127.0.0.1:54324.
- Avant de rendre la main : `pnpm lint && pnpm typecheck && pnpm test && pnpm build`, et si `supabase/` a changé : `pnpm db:rollback-check && pnpm db:test && pnpm db:types`. Si l'authentification ou les pages ont changé : `pnpm test:integration && pnpm test:e2e`. La CI (`.github/workflows/ci.yml`) exécute les mêmes commandes.

## Règles

- **TypeScript strict** avec `noUncheckedIndexedAccess` : pas de `any`, pas de `!` pour contourner un accès indexé.
- **RTL** : classes Tailwind logiques uniquement : `ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `text-start`, `text-end`, `border-s`, `border-e`, `rounded-s`, `rounded-e`, `rounded-ss`, `rounded-se`, `rounded-es`, `rounded-ee`, `float-start`, `float-end`, `clear-start`, `clear-end`, `scroll-ms`, `scroll-me`, `scroll-ps`, `scroll-pe`. Leurs équivalents physiques (`ml-`, `left-`, `text-left`, `border-l`, `rounded-tl`, `float-left`, `scroll-ml`…) sont refusés par ESLint dans les `className` et les appels `cn`/`clsx` ; non vérifié dans les `@apply` CSS ni les classes construites dynamiquement, à éviter.
- **Multi-établissement** (ADR 0002, 0007) : l'établissement (`public.schools`) est le tenant ; les rôles (`app_role`) sont attribués par établissement dans `public.memberships`, cumulables. Le filtrage dans le code ne remplace jamais la RLS. Toute nouvelle table métier :
  - porte `school_id` NOT NULL, avec clé étrangère vers `schools` et index ;
  - active la RLS dans la migration qui la crée ; politiques par opération, `to authenticated`, fondées sur `app_private.user_school_ids()` et `app_private.user_school_ids_with_roles('{...}')` (forme `(select auth.uid())`, `school_id in (select app_private.user_school_ids())`), jamais `using (true)` ;
  - `revoke all` à `anon` et `authenticated`, puis `grant select` et `grant update (colonnes)` limité aux champs modifiables (la RLS filtre les lignes, pas les colonnes) ;
  - a son fichier pgTAP sur les deux établissements du jeu de test (`supabase/tests/helpers/`, modèle : `supabase/tests/tenancy_isolation.test.sql`).
- **Dans les politiques RLS, toujours la forme colonne IN (SELECT fonction_ensemble(...)), jamais une fonction évaluée ligne par ligne.** `app_private.has_role(school_id, ...)` est réservée aux vérifications ponctuelles côté serveur (ADR 0007, vérifié par pgTAP).
- **Jamais de `SECURITY DEFINER` dans `public`** (exposé par l'API). Une fonction `SECURITY DEFINER` va dans `app_private`, avec `set search_path = ''` et des noms qualifiés (vérifié par pgTAP).
- **Migrations réversibles** (ADR 0006) : créer avec `pnpm db:new <nom>` ; toute migration a son rollback dans `supabase/rollbacks`, qui l'annule exactement (vérifié par `db:rollback-check`). Ne jamais modifier une migration déjà appliquée ou poussée : en ajouter une nouvelle. Après chaque migration, régénérer les types (`pnpm db:types`) et les commiter.
- **service_role** : `@/lib/supabase/admin` contourne la RLS. Réservé aux tâches système (cron, webhooks : `src/app/api/cron`, `src/app/api/webhooks`, `src/features/*/jobs`) ; jamais dans le chemin d'une requête utilisateur (page, composant, Server Action), qui utilise `@/lib/supabase/server`.
- **Schéma `app_private`** (ADR 0006) : jamais exposé par l'API (absent de `[api].schemas` dans `supabase/config.toml`). `anon` n'y a aucun droit, `authenticated` seulement USAGE ; aucune fonction ni table n'y est accessible par défaut (droits par défaut révoqués, y compris EXECUTE à PUBLIC). Une fonction utilisée par une politique RLS reçoit un `GRANT EXECUTE ... TO authenticated` explicite, fonction par fonction, dans sa migration ; jamais de GRANT sur une table de ce schéma.
- **Authentification** (ADR 0008) : toute page ou Server Action de l'application (`src/app/[locale]/(app)`) obtient l'établissement courant et les rôles par `getCurrentSchool(locale)` de `src/lib/auth/current-school.ts` (ou `getStaffContext()` pour les pages sans établissement : choix, accès non disponible). Jamais de lecture directe du cookie `lms_school_id`, jamais de `school_id` venu du client sans revérification. Décision d'accès côté serveur : `supabase.auth.getUser()`, jamais `getSession()` seul. Toute redirection vers une page demandée passe par `safeNextPath()`. Une nouvelle page publique s'ajoute explicitement à `src/lib/auth/routes.ts` (refus par défaut dans `src/proxy.ts`). Pas de message qui révèle si un compte existe.
- **Secrets** : aucun secret, clé, URL réelle ou donnée personnelle en dur. Nouvelle variable = schéma dans `src/env.ts` + entrée commentée dans `.env.example`. Les variables `NEXT_PUBLIC_*` sont publiques : jamais de secret dedans.
- **Données réelles** : aucune donnée réelle d'enfant avant l'autorisation CNDP et le consentement des parents (ADR 0003). Données fictives uniquement.
- **Traductions** (ADR 0005) : tout texte visible passe par `messages/fr.json` et `messages/ar.json` (`useTranslations` / `getTranslations` de next-intl) ; aucun texte en dur dans les composants, y compris `aria-label`, `title`, `alt` et métadonnées. Ajouter chaque clé dans les deux fichiers. Interface en FR et AR seulement, pas de darija. Liens internes via `Link` de `@/lib/i18n/navigation`, pas `next/link`.
- **Formatage** : dates, nombres et montants (MAD) uniquement via `src/lib/i18n/format.ts` (chiffres latins en arabe, fuseau `Africa/Casablanca`). Pas de `toLocaleString` ni de `Intl` direct ailleurs. Formater côté serveur de préférence (Server Components) : le résultat d'Intl varie selon le navigateur.
- **Déploiement** : cible Cloudflare Workers via OpenNext (ADR 0004). Réglages hors dépôt (Supabase hébergé, Cloudflare) : `docs/mise-en-production.md`, à mettre à jour dans la même PR que tout changement d'auth, d'email, de redirection ou de variable d'environnement. Vérifier la compatibilité de toute fonctionnalité Next.js ou API Node utilisée.
- **Dépendances** : versions exactes (`pnpm add -E`). Ne pas contourner la politique de délai minimal de publication de pnpm (`minimumReleaseAgeExclude`) sans le signaler.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
