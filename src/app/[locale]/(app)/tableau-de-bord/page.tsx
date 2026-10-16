import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SignOutButton } from '@/features/auth/components/SignOutButton';
import { getCurrentSchool } from '@/lib/auth/current-school';
import { authRoutes } from '@/lib/auth/routes';
import { Link } from '@/lib/i18n/navigation';
import { routing } from '@/lib/i18n/routing';

// Tableau de bord provisoire (S1-b) : établissement courant et rôles.
export default async function DashboardPage({
  params,
}: PageProps<'/[locale]/tableau-de-bord'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const { school, roles, schools } = await getCurrentSchool(locale);
  const t = await getTranslations('App');

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{t('dashboard.title')}</h1>
        <SignOutButton locale={locale} />
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
        <dt className="font-semibold">{t('dashboard.school')}</dt>
        <dd data-testid="current-school">{school.name}</dd>
        <dt className="font-semibold">{t('dashboard.roles')}</dt>
        <dd>
          <ul data-testid="current-roles" className="flex flex-wrap gap-2">
            {roles.map((role) => (
              <li
                key={role}
                className="rounded-md bg-emerald-50 px-2 py-0.5 text-emerald-900"
              >
                {t(`roles.${role}`)}
              </li>
            ))}
          </ul>
        </dd>
      </dl>
      {schools.length > 1 ? (
        <Link
          href={authRoutes.chooseSchool}
          className="text-emerald-900 underline"
        >
          {t('dashboard.changeSchool')}
        </Link>
      ) : null}
    </>
  );
}
