import { describe, expect, it } from 'vitest';
import { formatDate, formatMAD, formatNumber } from './format';

// Chiffres arabes-indiens (U+0660-0669) et persans (U+06F0-06F9).
const arabicIndicDigits = /[\u0660-\u0669\u06F0-\u06F9]/;
const RLM = '\u200f'; // marque droite-à-gauche ajoutée par Intl en arabe
const NBSP = '\u00a0'; // espace insécable avant la devise

describe('formatMAD', () => {
  it('formate un montant en dirhams en français', () => {
    expect(formatMAD(1250.5, 'fr')).toBe(`1.250,50${NBSP}MAD`);
  });

  it('formate un montant en dirhams en arabe avec des chiffres latins', () => {
    const formatted = formatMAD(1250.5, 'ar');
    expect(formatted).toBe(`${RLM}1.250,50${NBSP}د.م.${RLM}`);
    expect(formatted).not.toMatch(arabicIndicDigits);
  });
});

describe('formatDate', () => {
  // 14 septembre 2026 à 00:30 à Casablanca (UTC+1), encore le 13 en UTC.
  const date = new Date('2026-09-13T23:30:00Z');

  it('formate une date en français, dans le fuseau de Casablanca', () => {
    expect(formatDate(date, 'fr')).toBe('14 septembre 2026');
  });

  it('formate une date en arabe avec des chiffres latins', () => {
    const formatted = formatDate(date, 'ar');
    expect(formatted).toBe('14 شتنبر 2026');
    expect(formatted).not.toMatch(arabicIndicDigits);
  });

  it('impose les chiffres latins même avec des options personnalisées', () => {
    expect(
      formatDate(date, 'ar', { day: 'numeric', month: 'numeric' }),
    ).not.toMatch(arabicIndicDigits);
  });
});

describe('formatNumber', () => {
  it('utilise des chiffres latins en arabe', () => {
    expect(formatNumber(1234567.89, 'ar')).toBe('1.234.567,89');
    expect(formatNumber(1234567.89, 'fr')).toBe('1.234.567,89');
  });
});
