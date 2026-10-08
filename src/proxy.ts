import createMiddleware from 'next-intl/middleware';
import { routing } from '@/lib/i18n/routing';

// Next.js 16 : "proxy" remplace "middleware". Redirige / vers /fr ou /ar
// selon le cookie de langue puis l'en-tête Accept-Language (ADR 0005).
export default createMiddleware(routing);

export const config = {
  // Toutes les routes sauf API, fichiers internes de Next et fichiers statiques.
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
};
