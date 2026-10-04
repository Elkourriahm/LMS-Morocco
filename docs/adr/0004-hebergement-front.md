# ADR 0004 : Hébergement du frontend

- **Date** : 2026-10-04
- **Statut** : Acceptée

## Contexte

Le frontend Next.js doit être hébergé avec un budget mensuel très limité, pour un produit commercial (abonnements payés par les établissements).

## Options

- Vercel, offre gratuite (Hobby) : intégration Next.js native, mais l'offre gratuite est réservée à un usage non commercial ; l'offre payante dépasse le budget visé.
- Cloudflare Workers via `@opennextjs/cloudflare` : offre gratuite puis tarification à l'usage, compatible avec un usage commercial.
- Serveur Node.js auto-hébergé (VPS) : coût faible mais exploitation (mises à jour, sécurité, disponibilité) à notre charge.

## Décision

Déployer le frontend sur Cloudflare Workers via OpenNext (`@opennextjs/cloudflare`) plutôt que sur Vercel.

## Conséquences

- Le runtime Workers n'est pas un Node.js complet : chaque fonctionnalité Next.js (middleware, ISR, cache, optimisation d'images, API Node utilisées par les dépendances) doit être vérifiée contre la matrice de compatibilité d'OpenNext avant adoption.
- Le déploiement et la configuration Wrangler sont hors du présent socle et feront l'objet d'une session dédiée.
- Un retour vers Vercel ou un VPS reste possible tant que le code n'utilise pas d'API propre à Cloudflare en dehors d'une couche d'adaptation.
