# ADR 0002 : Modèle multi-établissement

- **Date** : 2026-10-04
- **Statut** : Acceptée

## Contexte

Le SaaS dessert plusieurs écoles privées et centres de soutien, qui partagent une même application sans partager leurs données.

## Options

- Une base partagée avec isolation appliquée uniquement dans le code applicatif.
- Une base partagée avec isolation imposée par Postgres RLS.
- Une base dédiée par établissement.

## Décision

Utiliser une base partagée. Toute table métier porte `school_id` et l’isolation est appliquée par RLS Postgres, pas seulement dans le code. Le type d’établissement est « école » ou « centre ». Le terme générique « groupe » couvre une classe ou un cours.

## Conséquences

Les migrations et tests devront inclure les politiques RLS et vérifier l’absence de fuite inter-établissements. Le modèle reste générique pour les deux types de structure.
