import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import betterTailwindcss from 'eslint-plugin-better-tailwindcss';

// Interface FR/AR : les classes Tailwind directionnelles physiques sont
// interdites au profit des classes logiques, qui s'inversent en RTL.
// Chaque motif accepte les variantes (md:, hover:, rtl:…), le préfixe
// important (!), le négatif (-) et le suffixe important (!) de Tailwind 4.
const physicalToLogical = [
  ['ml', 'ms'],
  ['mr', 'me'],
  ['pl', 'ps'],
  ['pr', 'pe'],
  ['left', 'start'],
  ['right', 'end'],
  ['scroll-ml', 'scroll-ms'],
  ['scroll-mr', 'scroll-me'],
  ['scroll-pl', 'scroll-ps'],
  ['scroll-pr', 'scroll-pe'],
];

// Classes sans valeur négative et dont la forme nue existe ("border-l",
// "rounded-l") : le suffixe "-…" est facultatif.
const physicalToLogicalBare = [
  ['border-l', 'border-s'],
  ['border-r', 'border-e'],
  ['rounded-l', 'rounded-s'],
  ['rounded-r', 'rounded-e'],
  ['rounded-tl', 'rounded-ss'],
  ['rounded-tr', 'rounded-se'],
  ['rounded-bl', 'rounded-es'],
  ['rounded-br', 'rounded-ee'],
];

// Classes à valeur fixe.
const physicalToLogicalExact = [
  ['text-left', 'text-start'],
  ['text-right', 'text-end'],
  ['float-left', 'float-start'],
  ['float-right', 'float-end'],
  ['clear-left', 'clear-start'],
  ['clear-right', 'clear-end'],
];

const rtlRestrictions = [
  ...physicalToLogical.map(([physical, logical]) => ({
    pattern: `^((?:[^:]+:)*!?-?)${physical}-(.+)$`,
    fix: `$1${logical}-$2`,
    message: `Classe physique "${physical}-*" interdite (RTL) : utiliser "${logical}-*".`,
  })),
  ...physicalToLogicalBare.map(([physical, logical]) => ({
    pattern: `^((?:[^:]+:)*!?)${physical}((?:-.+)?!?)$`,
    fix: `$1${logical}$2`,
    message: `Classe physique "${physical}-*" interdite (RTL) : utiliser "${logical}-*".`,
  })),
  ...physicalToLogicalExact.map(([physical, logical]) => ({
    pattern: `^((?:[^:]+:)*!?)${physical}(!?)$`,
    fix: `$1${logical}$2`,
    message: `Classe physique "${physical}" interdite (RTL) : utiliser "${logical}".`,
  })),
];

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ['**/*.{js,jsx,mjs,ts,tsx,mts}'],
    plugins: { 'better-tailwindcss': betterTailwindcss },
    rules: {
      'better-tailwindcss/no-restricted-classes': [
        'error',
        { restrict: rtlRestrictions },
      ],
    },
  },
  // Le client service_role contourne la RLS (ADR 0006) : importable seulement
  // depuis les tâches système (cron, webhooks, jobs), jamais depuis une page,
  // un composant ou une Server Action servant un utilisateur.
  {
    files: ['src/**/*.{ts,tsx,mts}'],
    ignores: [
      'src/lib/supabase/admin.ts',
      'src/app/api/cron/**',
      'src/app/api/webhooks/**',
      'src/features/*/jobs/**',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/lib/supabase/admin', '**/supabase/admin'],
              message:
                'Client service_role réservé aux tâches système (src/app/api/cron, src/app/api/webhooks, src/features/*/jobs). Utiliser @/lib/supabase/server.',
            },
          ],
        },
      ],
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
  ]),
]);
