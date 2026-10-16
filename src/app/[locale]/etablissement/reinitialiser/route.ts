import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';
import { hasLocale } from 'next-intl';
import { SCHOOL_COOKIE } from '@/lib/auth/current-school';
import { authRoutes } from '@/lib/auth/routes';
import { routing } from '@/lib/i18n/routing';

// Efface un cookie d'établissement invalide ou falsifié, puis renvoie au
// choix d'établissement (ADR 0008). Appelé par getCurrentSchool : un Server
// Component ne peut pas modifier les cookies.
export async function GET(
  _request: NextRequest,
  ctx: RouteContext<'/[locale]/etablissement/reinitialiser'>,
) {
  const { locale: requested } = await ctx.params;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;
  (await cookies()).delete(SCHOOL_COOKIE);
  redirect(`/${locale}${authRoutes.chooseSchool}`);
}
