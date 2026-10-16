'use client';

import { useTranslations } from 'next-intl';
import { useActionState, useRef } from 'react';
import { FormField } from '@/components/ui/FormField';
import type { Locale } from '@/lib/i18n/routing';
import { type FormState, updatePassword } from '../actions';
import { PASSWORD_MIN_LENGTH } from '../schemas';
import { useFocusFirstError } from './useFocusFirstError';

const initialState: FormState<'password' | 'confirm'> = { status: 'idle' };

export function NewPasswordForm({ locale }: { locale: Locale }) {
  const t = useTranslations('Auth');
  const [state, formAction, pending] = useActionState(
    updatePassword,
    initialState,
  );
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);
  const alertRef = useRef<HTMLParagraphElement>(null);
  useFocusFirstError(
    state,
    [
      { name: 'password', ref: passwordRef },
      { name: 'confirm', ref: confirmRef },
    ],
    alertRef,
  );

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      {state.formError ? (
        <p
          ref={alertRef}
          tabIndex={-1}
          role="alert"
          className="rounded-md border border-red-700 bg-red-50 px-3 py-2 font-medium text-red-800"
        >
          {t(`errors.${state.formError}`)}
        </p>
      ) : null}
      <FormField
        id="password"
        name="password"
        type="password"
        autoComplete="new-password"
        label={t('fields.newPassword')}
        hint={t('newPassword.hint', { min: PASSWORD_MIN_LENGTH })}
        error={
          state.fieldErrors?.password
            ? t(`errors.${state.fieldErrors.password}`, {
                min: PASSWORD_MIN_LENGTH,
              })
            : undefined
        }
        inputRef={passwordRef}
      />
      <FormField
        id="confirm"
        name="confirm"
        type="password"
        autoComplete="new-password"
        label={t('fields.confirmPassword')}
        error={
          state.fieldErrors?.confirm
            ? t(`errors.${state.fieldErrors.confirm}`)
            : undefined
        }
        inputRef={confirmRef}
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-emerald-800 px-4 py-2 font-semibold text-white disabled:opacity-60"
      >
        {pending ? t('newPassword.submitting') : t('newPassword.submit')}
      </button>
    </form>
  );
}
