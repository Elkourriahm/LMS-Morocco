'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/lib/i18n/navigation';
import { routing } from '@/lib/i18n/routing';

// Bascule entre les langues d'interface en restant sur la même page.
export function LanguageSwitcher() {
  const t = useTranslations('LanguageSwitcher');
  const currentLocale = useLocale();
  const pathname = usePathname();

  return (
    <nav aria-label={t('label')}>
      <ul className="flex gap-2">
        {routing.locales.map((locale) => {
          const isCurrent = locale === currentLocale;
          return (
            <li key={locale}>
              <Link
                href={pathname}
                locale={locale}
                lang={locale}
                hrefLang={locale}
                aria-current={isCurrent ? 'true' : undefined}
                className={
                  isCurrent
                    ? 'rounded-md bg-emerald-800 px-3 py-1 text-white'
                    : 'rounded-md border border-emerald-800 px-3 py-1 text-emerald-900 hover:bg-emerald-50'
                }
              >
                {t(`locales.${locale}`)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
