// pnpm db:seed-dev : refus d'une base non locale, idempotence. Supabase local
// requis pour le second test.
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { repoRoot } from './lib/migrations.mts';

function runSeed(env: Record<string, string> = {}) {
  return spawnSync(
    process.execPath,
    [
      '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON',
      '--conditions=react-server',
      '--import',
      './scripts/lib/alias-hooks.mts',
      'scripts/db-seed-dev.mts',
    ],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, ...env },
      timeout: 60_000,
    },
  );
}

describe('pnpm db:seed-dev', () => {
  it.each([
    'https://abcdefghijklmnop.supabase.co',
    'http://192.168.1.10:54321',
    'http://localhost.exemple.test:54321',
  ])('refuse une URL non locale (%s), avant tout appel réseau', (url) => {
    const result = runSeed({ NEXT_PUBLIC_SUPABASE_URL: url });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("n'est pas une base Supabase locale");
    expect(result.stdout).toBe('');
  });

  it('est idempotent', async () => {
    const first = runSeed();
    expect(first.status, first.stderr).toBe(0);
    const second = runSeed();
    expect(second.status, second.stderr).toBe(0);

    // Même jeu de données après deux exécutions.
    const { createAdminClient } = await import('../src/lib/supabase/admin');
    const admin = createAdminClient();
    const memberships = await admin
      .from('memberships')
      .select('role, school_id')
      .in('school_id', [
        '5c000000-0000-4000-8000-00000000000a',
        '5c000000-0000-4000-8000-00000000000b',
      ]);
    expect(memberships.error).toBeNull();
    expect(memberships.data).toHaveLength(6);
  });
});
