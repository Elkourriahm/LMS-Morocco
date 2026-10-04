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
];

const rtlRestrictions = [
  ...physicalToLogical.map(([physical, logical]) => ({
    pattern: `^((?:[^:]+:)*!?-?)${physical}-(.+)$`,
    fix: `$1${logical}-$2`,
    message: `Classe physique "${physical}-*" interdite (RTL) : utiliser "${logical}-*".`,
  })),
  ...[
    ['left', 'start'],
    ['right', 'end'],
  ].map(([physical, logical]) => ({
    pattern: `^((?:[^:]+:)*!?)text-${physical}(!?)$`,
    fix: `$1text-${logical}$2`,
    message: `Classe physique "text-${physical}" interdite (RTL) : utiliser "text-${logical}".`,
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
