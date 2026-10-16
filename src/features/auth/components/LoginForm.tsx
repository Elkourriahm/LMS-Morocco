'use client';

import { useTranslations } from 'next-intl';
import { useActionState, useRef } from 'react';
import { FormField } from '@/components/ui/FormField';
import { authRoutes } from '@/lib/auth/routes';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import { type FormState, signIn } from '../actions';
import { useFocusFirstError } from './useFocusFirstError';

const initialState: FormState<'email' | 'password'> = { status: 'idle' };

export function LoginForm({ locale, next }: { locale: Locale; next?: string }) {
  const t = useTranslations('Auth');
  const [state, formAction, pending] = useActionState(signIn, initialState);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const alertRef = useRef<HTMLParagraphElement>(null);
  useFocusFirstError(
    state,
    [
      { name: 'email', ref: emailRef },
      { name: 'password', ref: passwordRef },
    ],
    alertRef,
  );

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {state.formError ? (
        <p
          ref={alertRef}
          tabIndex={-1}
          role="alert"
          data-testid="form-error"
          className="rounded-md border border-red-700 bg-red-50 px-3 py-2 font-medium text-red-800"
        >
          {t(`errors.${state.formError}`)}
        </p>
      ) : null}
      <FormField
        id="email"
        name="email"
        type="email"
        autoComplete="username"
        label={t('fields.email')}
        defaultValue={state.email}
        error={
          state.fieldErrors?.email
            ? t(`errors.${state.fieldErrors.email}`)
            : undefined
        }
        ltr
        inputRef={emailRef}
      />
      <FormField
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        label={t('fields.password')}
        error={
          state.fieldErrors?.password
            ? t(`errors.${state.fieldErrors.password}`)
            : undefined
        }
        inputRef={passwordRef}
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-emerald-800 px-4 py-2 font-semibold text-white disabled:opacity-60"
      >
        {pending ? t('login.submitting') : t('login.submit')}
      </button>
      <Link
        href={authRoutes.forgotPassword}
        className="text-emerald-900 underline"
      >
        {t('login.forgotLink')}
      </Link>
    </form>
  );
}
