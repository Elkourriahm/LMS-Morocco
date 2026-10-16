import type { Ref } from 'react';

type FormFieldProps = {
  id: string;
  name: string;
  label: string;
  type?: 'text' | 'email' | 'password';
  autoComplete?: string;
  defaultValue?: string;
  /** Message d'erreur traduit, relié au champ par aria-describedby. */
  error?: string;
  /** Aide traduite, reliée au champ par aria-describedby. */
  hint?: string;
  /** Saisie toujours de gauche à droite (email), même en arabe. */
  ltr?: boolean;
  inputRef?: Ref<HTMLInputElement>;
};

// Champ de formulaire accessible : label associé, aide et erreur annoncées
// par les lecteurs d'écran (aria-describedby, aria-invalid).
export function FormField({
  id,
  name,
  label,
  type = 'text',
  autoComplete,
  defaultValue,
  error,
  hint,
  ltr,
  inputRef,
}: FormFieldProps) {
  const hintId = `${id}-aide`;
  const errorId = `${id}-erreur`;
  const describedBy = [hint ? hintId : null, error ? errorId : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      {hint ? (
        <p id={hintId} className="text-sm text-gray-700">
          {hint}
        </p>
      ) : null}
      <input
        ref={inputRef}
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        dir={ltr ? 'ltr' : undefined}
        required
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={
          error
            ? 'rounded-md border-2 border-red-700 px-3 py-2 text-start'
            : 'rounded-md border border-gray-500 px-3 py-2 text-start'
        }
      />
      {error ? (
        <p id={errorId} className="text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
