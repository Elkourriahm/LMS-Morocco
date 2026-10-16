import { notFound, redirect as redirectToPath } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { getStaffContext } from '@/lib/auth/current-school';
import { safeNextPath } from '@/lib/auth/next-path';
import { authRoutes } from '@/lib/auth/routes';
import { redirect } from '@/lib/i18n/navigation';
import { routing } from '@/lib/i18n/routing';

export default async function LoginPage({
  params,
  searchParams,
}: PageProps<'/[locale]/connexion'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const next = safeNextPath((await searchParams).next);

  // Déjà connecté : page demandée, ou tableau de bord.
  const context = await getStaffContext();
  if (context.status === 'ok') {
    if (next) redirectToPath(next);
    redirect({ href: authRoutes.dashboard, locale });
  }

  const t = await getTranslations('Auth');
  return (
    <>
      <h1 className="text-2xl font-semibold">{t('login.title')}</h1>
      <LoginForm locale={locale} next={next} />
    </>
  );
}
