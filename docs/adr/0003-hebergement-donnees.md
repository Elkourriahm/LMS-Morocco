# ADR 0003 : Hébergement et données personnelles

- **Date** : 2026-10-04
- **Statut** : Acceptée, sous réserve réglementaire

## Contexte

Le produit traitera des données personnelles, potentiellement celles de mineurs, et relève du cadre marocain de protection des données.

## Options

- Héberger les données dans une région UE avec les formalités de transfert requises.
- Héberger les données au Maroc si une offre adaptée devient disponible.

## Décision

Prévoir Supabase en région UE et demander l’autorisation de transfert à la CNDP conformément à la loi 09-08. Aucune donnée réelle d’enfant ne sera utilisée avant cette autorisation et le consentement des parents.

## Conséquences

Les environnements de développement et de test utilisent uniquement des données fictives. Le délai de traitement de la demande CNDP reste un point ouvert à confirmer avant toute mise en production avec des données réelles.
