// Validation du paramètre `next` (page demandée avant la connexion), contre
// les redirections ouvertes (ADR 0008).

const MAX_LENGTH = 2048;
const BASE = 'http://interne.invalid';

/**
 * Renvoie `value` si c'est un chemin relatif interne, sinon `undefined`.
 *
 * Accepté : commence par une seule « / » (`/fr/tableau-de-bord?x=1`).
 * Refusé : vide, URL absolue (`https://…`), chemin de protocole (`//hôte`),
 * barre oblique inverse (`/\hôte`, que les navigateurs lisent comme `//`),
 * caractères de contrôle et espaces (les navigateurs suppriment tabulations
 * et retours à la ligne : `/\t/hôte` devient `//hôte`), et tout ce qui,
 * résolu comme une URL, sortirait de l'origine.
 */
export function safeNextPath(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  if (value.length === 0 || value.length > MAX_LENGTH) return undefined;
  if (!value.startsWith('/') || value.startsWith('//')) return undefined;
  if (value.includes('\\')) return undefined;
  if (/[\s\p{Cc}]/u.test(value)) return undefined;

  const url = new URL(value, BASE);
  if (url.origin !== BASE) return undefined;
  return `${url.pathname}${url.search}${url.hash}`;
}
