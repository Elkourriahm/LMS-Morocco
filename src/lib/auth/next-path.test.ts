import { describe, expect, it } from 'vitest';
import { safeNextPath } from './next-path';

describe('safeNextPath', () => {
  it.each([
    '/fr/tableau-de-bord',
    '/ar/choisir-etablissement',
    '/fr/tableau-de-bord?onglet=1#haut',
  ])('accepte le chemin interne %s', (value) => {
    expect(safeNextPath(value)).toBe(value);
  });

  it.each([
    ['vide', ''],
    ['protocole relatif', '//evil.com'],
    ['URL absolue', 'https://evil.com'],
    ['barre oblique inverse', '/\\evil.com'],
    ['barre inverse plus loin', '/fr\\..\\..\\evil.com'],
    ['tabulation', '/\t/evil.com'],
    ['retour à la ligne', '/\n/evil.com'],
    ['espace', '/ /evil.com'],
    ['schéma javascript', 'javascript:alert(1)'],
    ['relatif sans barre', 'fr/tableau-de-bord'],
    ['triple barre', '///evil.com'],
  ])('refuse : %s', (_, value) => {
    expect(safeNextPath(value)).toBeUndefined();
  });

  it('refuse ce qui n’est pas une chaîne', () => {
    expect(safeNextPath(undefined)).toBeUndefined();
    expect(safeNextPath(null)).toBeUndefined();
    expect(safeNextPath(['/fr'])).toBeUndefined();
  });

  it('refuse un chemin trop long', () => {
    expect(safeNextPath(`/${'a'.repeat(3000)}`)).toBeUndefined();
  });

  it('normalise les segments sans sortir de l’origine', () => {
    expect(safeNextPath('/fr/../ar/tableau-de-bord')).toBe(
      '/ar/tableau-de-bord',
    );
  });
});
