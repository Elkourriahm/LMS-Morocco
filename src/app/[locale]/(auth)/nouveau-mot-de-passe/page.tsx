import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { NewPasswordForm } from '@/features/auth/components/NewPasswordForm';
import { getStaffContext } from '@/lib/auth/current-school';
import { authRoutes } from '@/lib/auth/routes';
import { redirect } from '@/lib/i18n/navigation';
import { routing } from '@/lib/i18n/routing';

// Atteinte par le lien de réinitialisation (session de récupération ouverte
// par reinitialisation/confirmer) ou par un utilisateur connecté.
export default async function NewPasswordPage({
  params,
}: PageProps<'/[locale]/nouveau-mot-de-passe'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const context = await getStaffContext();
  if (context.status === 'unauthenticated') {
    redirect({ href: authRoutes.login, locale });
  }

  const t = await getTranslations('Auth');
  return (
    <>
      <h1 className="text-2xl font-semibold">{t('newPassword.title')}</h1>
      <NewPasswordForm locale={locale} />
    </>
  );
}
