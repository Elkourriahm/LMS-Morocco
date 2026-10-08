import { ESLint } from 'eslint';
import { beforeAll, describe, expect, it } from 'vitest';

// Vérifie la règle RTL telle que configurée dans eslint.config.mjs.
const eslint = new ESLint({ cwd: import.meta.dirname });

async function rtlMessages(className: string) {
  const [result] = await eslint.lintText(
    `export const C = () => <div className="${className}" />;\n`,
    { filePath: 'src/components/ui/Example.tsx' },
  );
  return (result?.messages ?? []).filter(
    (message) => message.ruleId === 'better-tailwindcss/no-restricted-classes',
  );
}

async function fixed(className: string) {
  const fixer = new ESLint({ cwd: import.meta.dirname, fix: true });
  const [result] = await fixer.lintText(
    `export const C = () => <div className="${className}" />;\n`,
    { filePath: 'src/components/ui/Example.tsx' },
  );
  return result?.output;
}

describe('règle RTL (classes Tailwind physiques interdites)', () => {
  // Le premier passage charge toute la configuration (plusieurs secondes).
  beforeAll(() => rtlMessages(''), 120_000);

  it.each([
    'border-l-2',
    'rounded-r-md',
    'border-r',
    'rounded-tl-lg',
    'md:rounded-br-xl',
    'float-left',
    'clear-right',
    '-scroll-ml-4',
    'scroll-pr-2',
    'ml-4',
    'text-right',
  ])('signale %s', async (className) => {
    expect(await rtlMessages(className)).toHaveLength(1);
  });

  it.each([
    'border-s-2',
    'rounded-e-md',
    'rounded-ss-lg',
    'float-start',
    'scroll-ms-4',
    'rounded-lg',
    'border-lime-500',
    'border-red-500',
  ])('ne signale pas %s', async (className) => {
    expect(await rtlMessages(className)).toHaveLength(0);
  });

  it('corrige vers les classes logiques', { timeout: 120_000 }, async () => {
    expect(
      await fixed('border-l-2 rounded-tr-md hover:float-right scroll-pl-4!'),
    ).toContain('border-s-2 rounded-se-md hover:float-end scroll-ps-4!');
  });
});
