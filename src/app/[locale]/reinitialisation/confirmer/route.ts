import { redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';
import { hasLocale } from 'next-intl';
import { z } from 'zod';
import { authRoutes } from '@/lib/auth/routes';
import { routing } from '@/lib/i18n/routing';
import { createClient } from '@/lib/supabase/server';

// Lien de l'email de réinitialisation (supabase/templates/recovery.html) :
// vérifie le jeton côté serveur, ouvre une session de récupération (cookies)
// puis envoie vers le formulaire de nouveau mot de passe (ADR 0008).

const querySchema = z.object({
  token_hash: z.string().min(1).max(1024),
  type: z.literal('recovery'),
});

export async function GET(
  request: NextRequest,
  ctx: RouteContext<'/[locale]/reinitialisation/confirmer'>,
) {
  const { locale: requested } = await ctx.params;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const parsed = querySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  let verified = false;
  if (parsed.success) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type: 'recovery',
      token_hash: parsed.data.token_hash,
    });
    verified = !error;
  }

  redirect(
    verified
      ? `/${locale}${authRoutes.newPassword}`
      : `/${locale}${authRoutes.forgotPassword}?erreur=lien`,
  );
}
