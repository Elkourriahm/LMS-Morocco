import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ForgotPasswordForm } from '@/features/auth/components/ForgotPasswordForm';
import { authRoutes } from '@/lib/auth/routes';
import { Link } from '@/lib/i18n/navigation';
import { routing } from '@/lib/i18n/routing';

export default async function ForgotPasswordPage({
  params,
  searchParams,
}: PageProps<'/[locale]/mot-de-passe-oublie'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  // Lien de réinitialisation expiré ou invalide (reinitialisation/confirmer).
  const linkInvalid = (await searchParams).erreur === 'lien';
  const t = await getTranslations('Auth');

  return (
    <>
      <h1 className="text-2xl font-semibold">{t('forgot.title')}</h1>
      {linkInvalid ? (
        <p
          role="alert"
          className="rounded-md border border-red-700 bg-red-50 px-3 py-2 font-medium text-red-800"
        >
          {t('forgot.linkInvalid')}
        </p>
      ) : null}
      <p>{t('forgot.intro')}</p>
      <ForgotPasswordForm locale={locale} />
      <Link href={authRoutes.login} className="text-emerald-900 underline">
        {t('forgot.backToLogin')}
      </Link>
    </>
  );
}
