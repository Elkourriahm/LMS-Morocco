'use server';

// Server Actions de l'authentification du personnel (ADR 0008). Client
// utilisateur (@/lib/supabase/server) uniquement, jamais service_role.
// Aucune journalisation des valeurs saisies (mots de passe compris).
import { cookies } from 'next/headers';
import { redirect as redirectToPath } from 'next/navigation';
import { env } from '@/env';
import {
  SCHOOL_COOKIE,
  getStaffContext,
  schoolCookieOptions,
} from '@/lib/auth/current-school';
import { safeNextPath } from '@/lib/auth/next-path';
import { authRoutes } from '@/lib/auth/routes';
import { redirect } from '@/lib/i18n/navigation';
import { routing } from '@/lib/i18n/routing';
import { createClient } from '@/lib/supabase/server';
import {
  type FieldErrorCode,
  fieldErrors,
  forgotPasswordSchema,
  localeOnlySchema,
  loginSchema,
  newPasswordSchema,
  selectSchoolSchema,
} from './schemas';

export type FormErrorCode =
  'invalidCredentials' | 'samePassword' | 'unexpected';

export type FormState<Field extends string> = {
  status: 'idle' | 'error' | 'sent';
  fieldErrors?: Partial<Record<Field, FieldErrorCode>>;
  formError?: FormErrorCode;
  /** Email resaisi après une erreur. Jamais le mot de passe. */
  email?: string;
};

/** Champs texte du formulaire ; les fichiers éventuels sont ignorés. */
function formValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') values[key] = value;
  }
  return values;
}

function localeOf(formData: FormData) {
  const parsed = localeOnlySchema.safeParse(formValues(formData));
  return parsed.success ? parsed.data.locale : routing.defaultLocale;
}

// --- Connexion ----------------------------------------------------------------

export async function signIn(
  _previous: FormState<'email' | 'password'>,
  formData: FormData,
): Promise<FormState<'email' | 'password'>> {
  const values = formValues(formData);
  const parsed = loginSchema.safeParse(values);
  if (!parsed.success) {
    return {
      status: 'error',
      fieldErrors: fieldErrors(parsed.error, ['email', 'password'] as const),
      email: values.email,
    };
  }
  const { locale, email, password, next } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    // Message unique, que l'email existe ou non (pas d'énumération).
    return { status: 'error', formError: 'invalidCredentials', email };
  }

  // Nouvelle session : l'établissement courant sera rechoisi ou revalidé.
  (await cookies()).delete(SCHOOL_COOKIE);

  const target = safeNextPath(next);
  if (target) return redirectToPath(target);
  return redirect({ href: authRoutes.dashboard, locale });
}

// --- Mot de passe oublié ------------------------------------------------------

export async function requestPasswordReset(
  _previous: FormState<'email'>,
  formData: FormData,
): Promise<FormState<'email'>> {
  const values = formValues(formData);
  const parsed = forgotPasswordSchema.safeParse(values);
  if (!parsed.success) {
    return {
      status: 'error',
      fieldErrors: fieldErrors(parsed.error, ['email'] as const),
      email: values.email,
    };
  }
  const { locale, email } = parsed.data;

  const supabase = await createClient();
  // Résultat volontairement ignoré : même réponse que l'email existe ou non,
  // et en cas de limite de débit.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${env.NEXT_PUBLIC_SITE_URL}/${locale}${authRoutes.resetConfirm}`,
  });
  return { status: 'sent' };
}

// --- Nouveau mot de passe -----------------------------------------------------

export async function updatePassword(
  _previous: FormState<'password' | 'confirm'>,
  formData: FormData,
): Promise<FormState<'password' | 'confirm'>> {
  const parsed = newPasswordSchema.safeParse(formValues(formData));
  if (!parsed.success) {
    return {
      status: 'error',
      fieldErrors: fieldErrors(parsed.error, ['password', 'confirm'] as const),
    };
  }
  const { locale, password } = parsed.data;

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return redirect({ href: authRoutes.login, locale });

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return {
      status: 'error',
      formError: error.code === 'same_password' ? 'samePassword' : 'unexpected',
    };
  }
  return redirect({ href: authRoutes.dashboard, locale });
}

// --- Déconnexion --------------------------------------------------------------

export async function signOut(formData: FormData): Promise<never> {
  const locale = localeOf(formData);
  const supabase = await createClient();
  // Session de cet appareil seulement : les autres restent ouvertes.
  await supabase.auth.signOut({ scope: 'local' });
  (await cookies()).delete(SCHOOL_COOKIE);
  return redirect({ href: authRoutes.login, locale });
}

// --- Choix de l'établissement -------------------------------------------------

export async function selectSchool(formData: FormData): Promise<never> {
  const parsed = selectSchoolSchema.safeParse(formValues(formData));
  const locale = localeOf(formData);
  if (!parsed.success) {
    return redirect({ href: authRoutes.chooseSchool, locale });
  }

  // Revalidé sous RLS : on n'enregistre qu'un établissement où l'utilisateur
  // a un rôle du personnel.
  const context = await getStaffContext();
  if (context.status === 'unauthenticated') {
    return redirect({ href: authRoutes.login, locale });
  }
  const school = context.schools.find((s) => s.id === parsed.data.schoolId);
  if (!school) return redirect({ href: authRoutes.chooseSchool, locale });

  (await cookies()).set(SCHOOL_COOKIE, school.id, schoolCookieOptions);
  return redirect({ href: authRoutes.dashboard, locale });
}
