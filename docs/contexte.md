# Contexte du projet

Fichier de reprise entre sessions. Chargé automatiquement via `CLAUDE.md`. **À mettre à jour en fin de chaque session** : ligne dans l'historique, statut des stories, points ouverts.

Dernière mise à jour : 2026-10-08, après la session S0-b.

## Produit

SaaS multi-établissement pour les écoles privées et les centres de soutien marocains :

- vie scolaire : élèves, groupes, absences, notes ;
- paiements : plans tarifaires, échéances, encaissement, relances automatiques ;
- communication WhatsApp traduite en français, arabe et darija.

Utilisateurs : direction et caisse sur le web, enseignants, parents sur mobile (PWA, pas d'app native en V1). Interfaces en FR et AR (RTL).

Porteur : Ahmed, seul développeur, qui travaille par sessions Claude Code numérotées (S0-a, S0-b…), chacune avec user story, critères d'acceptation, périmètre strict et compte rendu. Le planning de référence (capacité, backlog, sprints, démarches) est le fichier local `Planning_MVP_SaaS_ecoles.xlsx`, hors dépôt. Sprint 1 : à partir du mardi 6 octobre 2026, sprints de deux semaines.

## État actuel

Socle technique (S0-a) et i18n FR/AR avec RTL (S0-b, branche `feat/s0b-i18n`, à fusionner dans main par PR) terminés. Aucune fonctionnalité métier. Pas encore de Supabase, d'auth ni de déploiement. Remote GitHub : `Elkourriahm/LMS-Morocco` (`main` poussé).

| Élément    | Version / choix                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------------ |
| Node       | 24 LTS (`.nvmrc` 24.21.0, `engines` `^24.11.0`)                                                              |
| pnpm       | 12.9.1 (`packageManager`)                                                                                    |
| Next.js    | 16.3.8 (App Router, Turbopack), React 19.3.0                                                                 |
| TypeScript | 5.9.3 strict + `noUncheckedIndexedAccess` (pas 7.x : typescript-eslint)                                      |
| Tailwind   | 4.3.3 (config CSS, pas de `tailwind.config`)                                                                 |
| Validation | zod 4.6.5 (`src/env.ts`, importé par `next.config.ts`)                                                       |
| Lint       | ESLint 9.39.5 + eslint-config-next + better-tailwindcss 4.7.0 (règle RTL), Prettier 3.9.9                    |
| Tests      | Vitest 5.0.3 (unitaires), Playwright 1.63.0 (e2e, Chromium)                                                  |
| i18n       | next-intl 4.14.9, routage par préfixe `/fr` `/ar`, `src/proxy.ts`, clés typées, `pnpm i18n:check` (ADR 0005) |
| Polices    | IBM Plex Sans + IBM Plex Sans Arabic via `next/font/google`                                                  |
| CI         | GitHub Actions : job `verify` (lint, typecheck, test, build) puis job `e2e`                                  |

## Feuille de route

Jalon 1, pilote dans un centre de soutien (sprints 1 à 5) :

| ID  | Story                                                                             | Sprint | Statut                                 |
| --- | --------------------------------------------------------------------------------- | ------ | -------------------------------------- |
| S0  | Initialisation : socle, CI, lint, i18n FR/AR avec RTL, fiches de décision         | 1      | En cours (S0-a socle, S0-b i18n faits) |
| S1  | Multi-établissement, auth, rôles (direction, caisse, enseignant, parent), RLS     | 1      | À faire                                |
| S2  | Élèves, tuteurs, groupes/classes, inscriptions, import CSV                        | 1      | À faire                                |
| S3  | Absences : saisie enseignant, vue direction                                       | 2      | À faire                                |
| S4  | Notes simples : évaluations, saisie, consultation                                 | 2      | À faire                                |
| S5  | Plans tarifaires (mensuel, par matière, annuel) et génération des échéances       | 2      | À faire                                |
| S6  | Encaissement espèces : reçus numérotés, annulation motivée, clôture de caisse     | 3      | À faire                                |
| S7  | Espace parent PWA : absences, notes, solde, reçus                                 | 3      | À faire                                |
| S8  | WhatsApp Cloud API : templates, webhooks, statuts, opt-in, coût par établissement | 4      | À faire                                |
| S9  | Relances : règles J-3, J+1, J+7, langue du parent, arrêt dès le paiement          | 4      | À faire                                |
| S10 | Traduction FR/AR/darija des messages, validée par un humain avant envoi           | 5      | À faire                                |
| S11 | Consentement des parents (CNDP), journal d'accès, mentions                        | 5      | À faire                                |
| S12 | Mise en production, sauvegardes, monitoring, import des données du pilote         | 5      | À faire                                |

Jalon 2, V1 écoles (sprints 6 à 8) : S13 paiement en ligne CMI, S14 SMS de secours, S15 assistant IA parents sur WhatsApp, S16 spécificités école (trimestres, bulletin, export Massar), S17 messagerie dans l'application. Coupes envisagées si retard, dans l'ordre : S14, S17, S15, S4. La darija et les relances ne sont pas coupables : ce sont les différenciateurs.

Prochaine session attendue : fin de S0 (probablement Supabase local) puis S1, à confirmer par Ahmed.

## Démarches hors code qui bloquent des stories

- Vérification Meta Business et numéro WhatsApp : bloque S8.
- Templates WhatsApp (relance, reçu, absence) : bloquent S8 et S9.
- Dossier CNDP (données de mineurs, transfert vers l'UE) : bloque la mise en service. Plus gros risque calendrier.
- Consentement écrit des parents du centre : bloque l'import des vraies données (S12).
- Contrat marchand CMI : bloque S13.

## Historique des sessions

| Session | Date       | Résultat                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S0-a    | 2026-10-04 | Socle repris d'une tentative interrompue (sauvegardée dans la branche `wip/etat-initial`, à ne pas supprimer). Corrections : règle RTL passée d'un script incomplet à ESLint, Node et `@types/node` alignés sur 24 LTS, validation de l'env au démarrage, CI compatible pnpm 12, LF imposé, dossiers manquants, docs. Tout au vert en local.                                                                           |
| S0-b    | 2026-10-08 | i18n FR/AR : next-intl 4.14.9, routage `/fr` `/ar` avec redirection de `/` par `src/proxy.ts`, `lang`/`dir` sur `<html>`, messages typés, `pnpm i18n:check` dans `pnpm lint`, polices IBM Plex, `src/lib/i18n/format.ts` (MAD, chiffres latins en arabe), `LanguageSwitcher`, règle RTL étendue (bordures, arrondis, float, clear, scroll), ADR 0005. Lint, typecheck, tests unitaires et e2e, build au vert en local. |

## Pièges connus

- **pnpm 12 et corepack** : corepack 0.34 (Node 24.11) ne lance pas pnpm 12. Utiliser un pnpm installé globalement (`npm i -g pnpm@12.9.1`) ou `npx pnpm@12.9.1 …`.
- **Délai minimal de publication pnpm** : une version publiée depuis moins d'un jour est refusée. Choisir une version antérieure plutôt que d'ajouter `minimumReleaseAgeExclude`.
- **CI** : `pnpm/action-setup` doit rester en v6.1.0 ou plus (support de pnpm 12).
- **Windows** : git est en `autocrlf` ; `.gitattributes` impose LF, sinon Prettier échoue.
- **CLAUDE.md** : `next dev` réécrit le bloc `nextjs-agent-rules`. Le laisser en place.
- **Règle RTL** : non appliquée aux `@apply` CSS, aux classes construites dynamiquement, aux classes arbitraires (`[margin-left:4px]`) ni aux `style` en ligne.
- **next-intl et pnpm** : next-intl 4.14 dépend de `@swc/core` et `@parcel/watcher` (extracteur de messages, non utilisé). Leurs scripts d'installation sont refusés dans `pnpm-workspace.yaml` (`allowBuilds: false`) ; sans cela `pnpm add` échoue avec `ERR_PNPM_IGNORED_BUILDS`.
- **Formatage Intl** : le résultat dépend de la version d'ICU (Node, navigateur). Les tests unitaires figent la sortie de Node 24 ; formater côté serveur de préférence.
- **Script i18n:check** : fichier `.mts` exécuté directement par Node 24 (suppression des types) ; `tsconfig` autorise donc `allowImportingTsExtensions`.

## Points ouverts

- Délai d'instruction CNDP (ADR 0003).
- Compatibilité OpenNext / Cloudflare Workers à vérifier à chaque fonctionnalité Next.js adoptée (ADR 0004).
- Budget à la mise en service : à trancher par Ahmed avant le sprint 5.
- Vérifier le passage de la CI sur GitHub (jamais constaté en session), notamment le téléchargement des polices au build et le test ESLint à froid.
- Node local en 24.11.1 : passer en 24.21.0 pour coller à la CI.
- Proxy Next.js 16 (`src/proxy.ts`, runtime Node.js) sur Cloudflare : support OpenNext récent et expérimental, à valider à la session de déploiement (repli : `middleware.ts` ou redirection fixe vers `/fr`, ADR 0005).
- Page 404 : celle par défaut de Next.js, en anglais. Ajouter un `not-found` traduit avec la première page métier.
- Relecture des textes arabes par un locuteur natif avant la mise en service.
