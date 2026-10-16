import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SignOutButton } from '@/features/auth/components/SignOutButton';
import { getStaffContext } from '@/lib/auth/current-school';
import { authRoutes } from '@/lib/auth/routes';
import { redirect } from '@/lib/i18n/navigation';
import { routing } from '@/lib/i18n/routing';

// Utilisateur connecté sans rôle du personnel. Les parents n'ont pas encore
// d'espace (S7, ADR 0007) : ils interagissent par WhatsApp.
export default async function UnavailablePage({
  params,
}: PageProps<'/[locale]/acces-non-disponible'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const context = await getStaffContext();
  if (context.status === 'unauthenticated') {
    return redirect({ href: authRoutes.login, locale });
  }
  if (context.schools.length > 0) {
    return redirect({ href: authRoutes.dashboard, locale });
  }

  const t = await getTranslations('App');
  return (
    <>
      <h1 className="text-2xl font-semibold">{t('unavailable.title')}</h1>
      <p role="status" data-testid="unavailable-message">
        {context.parentOnly
          ? t('unavailable.parentSoon')
          : t('unavailable.noAccess')}
      </p>
      <SignOutButton locale={locale} />
    </>
  );
}
