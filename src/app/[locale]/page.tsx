import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { env } from '@/env';
import { formatDate, formatMAD } from '@/lib/i18n/format';
import { routing } from '@/lib/i18n/routing';

// Valeurs fictives servant d'exemple de formatage.
const exampleDate = new Date('2026-09-14T08:30:00Z');
const exampleAmount = 1250.5;

export default async function HomePage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations('HomePage');

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <LanguageSwitcher />
      <div>
        <h1 className="text-3xl font-semibold">{env.NEXT_PUBLIC_APP_NAME}</h1>
        <p className="mt-3 text-lg">{t('tagline')}</p>
      </div>
      <section aria-labelledby="examples-title" className="text-start">
        <h2 id="examples-title" className="text-lg font-semibold">
          {t('examplesTitle')}
        </h2>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
          <dt className="font-semibold">{t('dateLabel')}</dt>
          <dd data-testid="example-date">{formatDate(exampleDate, locale)}</dd>
          <dt className="font-semibold">{t('amountLabel')}</dt>
          <dd data-testid="example-amount">
            {formatMAD(exampleAmount, locale)}
          </dd>
        </dl>
      </section>
    </main>
  );
}
