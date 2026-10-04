# ADR 0001 : Stack technique

- **Date** : 2026-10-04
- **Statut** : Acceptée

## Contexte

Le produit doit fournir une interface web de direction et une expérience mobile pour les parents, avec une base maintenable et un cloisonnement multi-établissement.

## Options

- Next.js avec TypeScript, Supabase et Tailwind CSS.
- Une application native dédiée et un backend séparé.

## Décision

Adopter Next.js App Router, TypeScript strict, Supabase (Postgres, RLS, Auth, Storage) et Tailwind CSS. Les parents utiliseront une PWA ; aucune application native n’est prévue en V1.

## Conséquences

Le socle partage une application web entre les rôles. Les capacités PWA et les services Supabase seront ajoutés dans des stories ultérieures.
