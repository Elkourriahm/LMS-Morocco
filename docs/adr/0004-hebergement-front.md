# ADR 0004 : Hébergement du frontend

- **Date** : 2026-10-04
- **Statut** : Acceptée

## Contexte

Le frontend doit respecter une contrainte de budget et permettre un usage commercial.

## Options

- Déployer Next.js sur Vercel.
- Déployer Next.js sur Cloudflare Workers avec OpenNext.

## Décision

Retenir Cloudflare Workers via `@opennextjs/cloudflare` plutôt que l’offre gratuite Vercel, dont l’usage commercial n’est pas permis dans le cadre retenu.

## Conséquences

Vérifier la compatibilité des fonctions Next.js utilisées avec OpenNext et l’environnement Workers lors de la session de déploiement. Cette dépendance de déploiement est hors périmètre du présent socle.
