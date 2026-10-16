import 'server-only';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { env } from '@/env';
import { redirect } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import { createClient } from '@/lib/supabase/server';
import {
  type CurrentSchoolDeps,
  type MembershipRow,
  type School,
  type StaffContext,
  type StaffRole,
  type StaffSchool,
  loadCurrentSchool,
  loadStaffContext,
} from './current-school-core';
import { authRoutes } from './routes';

/**
 * Établissement courant (ADR 0008). RÈGLE : toute page ou Server Action de
 * l'application passe par getCurrentSchool() ; jamais de lecture directe du
 * cookie ni de school_id venu du client.
 */

export const SCHOOL_COOKIE = 'lms_school_id';

/** httpOnly, secure en production, sameSite lax (ADR 0008). */
export const schoolCookieOptions = {
  httpOnly: true,
  secure: env.APP_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 60 * 60 * 24 * 30,
} as const;

const deps: CurrentSchoolDeps = {
  async getUserId() {
    const supabase = await createClient();
    // getUser() interroge le serveur d'auth : un jeton révoqué ou un compte
    // supprimé est refusé, contrairement à getSession() (ADR 0008).
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return data.user.id;
  },
  async listMemberships(userId) {
    const supabase = await createClient();
    // Client utilisateur, donc sous RLS. Filtre explicite sur user_id : la
    // direction voit aussi les appartenances des autres membres.
    const { data, error } = await supabase
      .from('memberships')
      .select('role, school:schools(id, name)')
      .eq('user_id', userId);
    if (error) throw new Error('Lecture des appartenances impossible.');
    return data satisfies MembershipRow[];
  },
  async readSchoolCookie() {
    return (await cookies()).get(SCHOOL_COOKIE)?.value;
  },
};

/** Utilisateur et établissements du personnel, une fois par requête. */
export const getStaffContext = cache((): Promise<StaffContext> =>
  loadStaffContext(deps),
);

const resolveCurrentSchool = cache(() => loadCurrentSchool(deps));

/**
 * Établissement courant et rôles de l'utilisateur, revalidés à chaque
 * requête contre memberships sous RLS. Redirige sinon : connexion, accès
 * non disponible, choix d'établissement, ou effacement d'un cookie invalide.
 */
export async function getCurrentSchool(locale: Locale): Promise<{
  school: School;
  roles: StaffRole[];
  schools: StaffSchool[];
}> {
  const result = await resolveCurrentSchool();
  switch (result.status) {
    case 'ok':
      return result;
    case 'unauthenticated':
      return redirect({ href: authRoutes.login, locale });
    case 'no-staff-access':
      return redirect({ href: authRoutes.unavailable, locale });
    case 'choose-school':
      return redirect({ href: authRoutes.chooseSchool, locale });
    case 'invalid-cookie':
      // Un Server Component ne peut pas modifier les cookies : un Route
      // Handler l'efface puis renvoie au choix d'établissement.
      return redirect({ href: authRoutes.clearSchool, locale });
  }
}
