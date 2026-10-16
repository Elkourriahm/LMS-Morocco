import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/lib/i18n/routing';
import { signOut } from '../actions';

export async function SignOutButton({ locale }: { locale: Locale }) {
  const t = await getTranslations('App');
  return (
    <form action={signOut}>
      <input type="hidden" name="locale" value={locale} />
      <button
        type="submit"
        className="rounded-md border border-emerald-800 px-3 py-1 text-emerald-900 hover:bg-emerald-50"
      >
        {t('signOut')}
      </button>
    </form>
  );
}
