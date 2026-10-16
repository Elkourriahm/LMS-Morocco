'use client';

import { useTranslations } from 'next-intl';
import { useActionState, useRef } from 'react';
import { FormField } from '@/components/ui/FormField';
import type { Locale } from '@/lib/i18n/routing';
import { type FormState, requestPasswordReset } from '../actions';
import { useFocusFirstError } from './useFocusFirstError';

const initialState: FormState<'email'> = { status: 'idle' };

export function ForgotPasswordForm({ locale }: { locale: Locale }) {
  const t = useTranslations('Auth');
  const [state, formAction, pending] = useActionState(
    requestPasswordReset,
    initialState,
  );
  const emailRef = useRef<HTMLInputElement>(null);
  const alertRef = useRef<HTMLParagraphElement>(null);
  useFocusFirstError(state, [{ name: 'email', ref: emailRef }], alertRef);

  if (state.status === 'sent') {
    // Même message que l'email existe ou non (ADR 0008).
    return (
      <p
        role="status"
        data-testid="reset-sent"
        className="rounded-md border border-emerald-800 bg-emerald-50 px-3 py-2"
      >
        {t('forgot.sent')}
      </p>
    );
  }

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
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
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-emerald-800 px-4 py-2 font-semibold text-white disabled:opacity-60"
      >
        {pending ? t('forgot.submitting') : t('forgot.submit')}
      </button>
    </form>
  );
}
