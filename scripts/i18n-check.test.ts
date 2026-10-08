import { describe, expect, it } from 'vitest';
import { checkMessages } from './i18n-check.mts';

describe('checkMessages', () => {
  it('accepte deux catalogues aux clés identiques et non vides', () => {
    expect(
      checkMessages({
        fr: { Home: { title: 'Accueil' } },
        ar: { Home: { title: 'الرئيسية' } },
      }),
    ).toEqual([]);
  });

  it('détecte une clé manquante, y compris imbriquée', () => {
    expect(
      checkMessages({
        fr: { Home: { title: 'Accueil', subtitle: 'Bienvenue' } },
        ar: { Home: { title: 'الرئيسية' } },
      }),
    ).toEqual([{ kind: 'missing', key: 'Home.subtitle', missingIn: 'ar' }]);
  });

  it('détecte une clé présente seulement dans le second catalogue', () => {
    expect(checkMessages({ fr: {}, ar: { extra: 'إضافي' } })).toEqual([
      { kind: 'missing', key: 'extra', missingIn: 'fr' },
    ]);
  });

  it('détecte une valeur vide ou composée d’espaces', () => {
    expect(
      checkMessages({
        fr: { a: 'A', b: '  ' },
        ar: { a: '', b: 'ب' },
      }),
    ).toEqual([
      { kind: 'empty', key: 'a', file: 'ar' },
      { kind: 'empty', key: 'b', file: 'fr' },
    ]);
  });

  it('refuse une valeur qui n’est pas une chaîne', () => {
    expect(checkMessages({ fr: { a: 1 }, ar: { a: ['x'] } })).toEqual([
      { kind: 'invalid', key: 'a', file: 'fr' },
      { kind: 'invalid', key: 'a', file: 'ar' },
    ]);
  });
});
