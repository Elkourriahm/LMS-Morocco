import { type CookieOptions, createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { env } from '@/env';
import { authRoutes, isPublicPath } from '@/lib/auth/routes';
import { routing } from '@/lib/i18n/routing';
import type { Database } from '@/lib/supabase/database.types';

// Next.js 16 : "proxy" remplace "middleware". Un seul proxy (ADR 0005, 0008) :
//   1. Supabase rafraîchit la session si besoin. Les nouveaux cookies sont
//      écrits dans la requête, pour que les Server Components de cette même
//      requête voient la session à jour, et repris sur la réponse ;
//   2. next-intl redirige / vers /fr ou /ar et transmet la langue ;
//   3. une page non publique sans session redirige vers /<locale>/connexion,
//      avec la page demandée dans `next`.
// Le proxy ne fait qu'un tri grossier : chaque page et chaque Server Action
// revérifie l'utilisateur avec getUser() (getCurrentSchool).

const handleI18n = createMiddleware(routing);

type PendingCookie = { name: string; value: string; options: CookieOptions };

export default async function proxy(request: NextRequest) {
  const pendingCookies: PendingCookie[] = [];
  const pendingHeaders: Record<string, string> = {};

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          pendingCookies.push(...cookiesToSet);
          Object.assign(pendingHeaders, headers);
        },
      },
    },
  );

  // Rafraîchit la session (et vérifie le jeton). Avec une clé de signature
  // symétrique, getClaims() interroge le serveur d'auth comme getUser().
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims.sub);

  // Créée après le rafraîchissement : transmet les cookies de requête à jour.
  let response = handleI18n(request);

  const [, locale, ...rest] = request.nextUrl.pathname.split('/');
  const hasLocale = routing.locales.some((l) => l === locale);
  if (
    hasLocale &&
    !signedIn &&
    !response.headers.has('location') &&
    !isPublicPath(rest.length > 0 ? `/${rest.join('/')}` : '')
  ) {
    const url = new URL(`/${locale}${authRoutes.login}`, request.url);
    url.searchParams.set(
      'next',
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    response = NextResponse.redirect(url);
  }

  for (const { name, value, options } of pendingCookies) {
    response.cookies.set(name, value, options);
  }
  for (const [key, value] of Object.entries(pendingHeaders)) {
    response.headers.set(key, value);
  }
  return response;
}

export const config = {
  // Toutes les routes sauf API, fichiers internes de Next et fichiers statiques.
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
};
