'use client';

import { type RefObject, useEffect } from 'react';

/**
 * Après une soumission en erreur, place le focus sur le premier champ en
 * erreur (dans l'ordre du formulaire), sinon sur le message d'erreur global.
 */
export function useFocusFirstError(
  state: { status: string; fieldErrors?: Record<string, unknown> },
  fields: { name: string; ref: RefObject<HTMLInputElement | null> }[],
  alertRef: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (state.status !== 'error') return;
    const first = fields.find(({ name }) => state.fieldErrors?.[name]);
    if (first) first.ref.current?.focus();
    else alertRef.current?.focus();
    // Une fois par nouvel état renvoyé par l'action.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
}
