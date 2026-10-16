import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { selectSchool } from '@/features/auth/actions';
import { SignOutButton } from '@/features/auth/components/SignOutButton';
import { getStaffContext } from '@/lib/auth/current-school';
import { authRoutes } from '@/lib/auth/routes';
import { redirect } from '@/lib/i18n/navigation';
import { routing } from '@/lib/i18n/routing';

// Choix de l'établissement courant, pour un membre du personnel de plusieurs
// établissements. Un seul : sélection automatique ; aucun : accès non
// disponible.
export default async function ChooseSchoolPage({
  params,
}: PageProps<'/[locale]/choisir-etablissement'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const context = await getStaffContext();
  if (context.status === 'unauthenticated') {
    return redirect({ href: authRoutes.login, locale });
  }
  if (context.schools.length === 0) {
    return redirect({ href: authRoutes.unavailable, locale });
  }
  if (context.schools.length === 1) {
    return redirect({ href: authRoutes.dashboard, locale });
  }

  const t = await getTranslations('App');
  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{t('choose.title')}</h1>
        <SignOutButton locale={locale} />
      </div>
      <p>{t('choose.intro')}</p>
      <ul className="flex flex-col gap-3" data-testid="school-list">
        {context.schools.map((school) => (
          <li key={school.id}>
            <form action={selectSchool}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="schoolId" value={school.id} />
              <button
                type="submit"
                className="flex w-full flex-col items-start gap-1 rounded-md border border-gray-500 px-4 py-3 text-start hover:bg-emerald-50"
              >
                <span className="font-semibold">{school.name}</span>
                <span className="text-sm text-gray-700">
                  {school.roles
                    .map((role) => t(`roles.${role}`))
                    .join(t('listSeparator'))}
                </span>
              </button>
            </form>
          </li>
        ))}
      </ul>
    </>
  );
}
