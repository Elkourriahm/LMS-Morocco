// Schémas zod des formulaires d'authentification (ADR 0008). Les messages
// sont des codes, traduits par l'interface (Auth.errors.*) : aucun texte
// affiché n'est produit ici.
import { z } from 'zod';
import { routing } from '@/lib/i18n/routing';

export const PASSWORD_MIN_LENGTH = 10;
const PASSWORD_MAX_LENGTH = 200;

export type FieldErrorCode =
  | 'required'
  | 'invalidEmail'
  | 'passwordTooShort'
  | 'passwordTooLong'
  | 'passwordMismatch';

const locale = z.enum(routing.locales);

const email = z
  .string({ error: 'required' })
  .trim()
  .min(1, { error: 'required' })
  .max(254, { error: 'invalidEmail' })
  .pipe(z.email({ error: 'invalidEmail' }));

export const loginSchema = z.object({
  locale,
  email,
  // Pas de règle de longueur à la connexion : seulement non vide.
  password: z
    .string({ error: 'required' })
    .min(1, { error: 'required' })
    .max(PASSWORD_MAX_LENGTH, { error: 'passwordTooLong' }),
  next: z.string().optional(),
});

export const forgotPasswordSchema = z.object({ locale, email });

export const newPasswordSchema = z
  .object({
    locale,
    password: z
      .string({ error: 'required' })
      .min(1, { error: 'required' })
      .min(PASSWORD_MIN_LENGTH, { error: 'passwordTooShort' })
      .max(PASSWORD_MAX_LENGTH, { error: 'passwordTooLong' }),
    confirm: z.string({ error: 'required' }).min(1, { error: 'required' }),
  })
  .refine((value) => value.password === value.confirm, {
    error: 'passwordMismatch',
    path: ['confirm'],
  });

export const selectSchoolSchema = z.object({ locale, schoolId: z.uuid() });

export const localeOnlySchema = z.object({ locale });

/** Première erreur de chaque champ, sous forme de code. */
export function fieldErrors<T extends string>(
  error: z.ZodError,
  fields: readonly T[],
): Partial<Record<T, FieldErrorCode>> {
  const result: Partial<Record<T, FieldErrorCode>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    const match = fields.find((name) => name === field);
    if (match && !result[match]) {
      result[match] = issue.message as FieldErrorCode;
    }
  }
  return result;
}
