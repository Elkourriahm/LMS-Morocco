import type { Locale } from './routing';

// Formatage des dates, nombres et montants pour l'interface.
// En arabe, les chiffres restent latins (0-9), usage courant au Maroc
// (ADR 0005) : numberingSystem "latn" est imposé partout.

export const TIME_ZONE = 'Africa/Casablanca';

const intlLocale: Record<Locale, string> = {
  fr: 'fr-MA',
  ar: 'ar-MA',
};

const numberingSystem = 'latn';

export function formatDate(
  date: Date,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'long' },
): string {
  return new Intl.DateTimeFormat(intlLocale[locale], {
    timeZone: TIME_ZONE,
    ...options,
    numberingSystem,
  }).format(date);
}

export function formatNumber(
  value: number,
  locale: Locale,
  options: Intl.NumberFormatOptions = {},
): string {
  return new Intl.NumberFormat(intlLocale[locale], {
    ...options,
    numberingSystem,
  }).format(value);
}

/** Montant en dirhams marocains (MAD), deux décimales. */
export function formatMAD(amount: number, locale: Locale): string {
  return formatNumber(amount, locale, {
    style: 'currency',
    currency: 'MAD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
