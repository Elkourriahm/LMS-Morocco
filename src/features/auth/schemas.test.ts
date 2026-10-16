import { describe, expect, it } from 'vitest';
import {
  fieldErrors,
  forgotPasswordSchema,
  loginSchema,
  newPasswordSchema,
  selectSchoolSchema,
} from './schemas';

// Données fictives.
const login = {
  locale: 'fr',
  email: 'direction@exemple.test',
  password: 'secret',
};

function errorsOf(
  schema: { safeParse: (v: unknown) => { success: boolean; error?: unknown } },
  value: unknown,
  fields: string[],
) {
  const result = schema.safeParse(value);
  if (result.success) return {};
  return fieldErrors(result.error as never, fields);
}

describe('loginSchema', () => {
  it('accepte un formulaire valide et retire les espaces de l’email', () => {
    expect(
      loginSchema.parse({ ...login, email: '  direction@exemple.test ' }),
    ).toMatchObject({ email: 'direction@exemple.test' });
  });

  it('exige email et mot de passe', () => {
    expect(
      errorsOf(loginSchema, { locale: 'fr', email: '', password: '' }, [
        'email',
        'password',
      ]),
    ).toEqual({ email: 'required', password: 'required' });
  });

  it('refuse un email invalide', () => {
    expect(
      errorsOf(loginSchema, { ...login, email: 'pas-un-email' }, ['email']),
    ).toEqual({ email: 'invalidEmail' });
  });

  it('refuse une langue inconnue', () => {
    expect(loginSchema.safeParse({ ...login, locale: 'en' }).success).toBe(
      false,
    );
  });

  it('refuse un mot de passe démesuré', () => {
    expect(
      errorsOf(loginSchema, { ...login, password: 'x'.repeat(201) }, [
        'password',
      ]),
    ).toEqual({ password: 'passwordTooLong' });
  });
});

describe('forgotPasswordSchema', () => {
  it('exige un email valide', () => {
    expect(
      errorsOf(forgotPasswordSchema, { locale: 'ar', email: 'x' }, ['email']),
    ).toEqual({ email: 'invalidEmail' });
    expect(
      forgotPasswordSchema.safeParse({ locale: 'ar', email: 'a@exemple.test' })
        .success,
    ).toBe(true);
  });
});

describe('newPasswordSchema', () => {
  it('exige au moins 10 caractères', () => {
    expect(
      errorsOf(
        newPasswordSchema,
        { locale: 'fr', password: '123456789', confirm: '123456789' },
        ['password', 'confirm'],
      ),
    ).toEqual({ password: 'passwordTooShort' });
  });

  it('accepte 10 caractères identiques à la confirmation', () => {
    expect(
      newPasswordSchema.safeParse({
        locale: 'fr',
        password: '1234567890',
        confirm: '1234567890',
      }).success,
    ).toBe(true);
  });

  it('signale une confirmation différente sur le champ confirm', () => {
    expect(
      errorsOf(
        newPasswordSchema,
        { locale: 'fr', password: '1234567890', confirm: '1234567891' },
        ['password', 'confirm'],
      ),
    ).toEqual({ confirm: 'passwordMismatch' });
  });
});

describe('selectSchoolSchema', () => {
  it('exige un uuid', () => {
    expect(
      selectSchoolSchema.safeParse({ locale: 'fr', schoolId: 'abc' }).success,
    ).toBe(false);
    expect(
      selectSchoolSchema.safeParse({
        locale: 'fr',
        schoolId: '5c000000-0000-4000-8000-00000000000a',
      }).success,
    ).toBe(true);
  });
});
