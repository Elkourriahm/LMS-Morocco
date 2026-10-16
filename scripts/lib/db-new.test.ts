import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { repoRoot } from './migrations.mts';

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

/**
 * Lance createMigration dans un processus enfant dont l'entrée standard est
 * un tube laissé ouvert (cas d'un agent ou d'un script) : avant la
 * correction, `supabase migration new` attendait la fin de stdin.
 */
function runWithOpenStdin(root: string): Promise<number | null> {
  const moduleUrl = pathToFileURL(
    join(repoRoot, 'scripts/lib/db-new.mts'),
  ).href;
  const code = `import { createMigration } from ${JSON.stringify(moduleUrl)};
createMigration('essai_stdin', ${JSON.stringify(root)});`;
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['--input-type=module', '-e', code], {
      stdio: ['pipe', 'ignore', 'inherit'],
    });
    const timer = setTimeout(() => child.kill(), 20_000);
    child.on('exit', (status) => {
      clearTimeout(timer);
      resolve(status);
    });
  });
}

describe('createMigration', () => {
  it('crée la migration et son rollback sans attendre stdin', async () => {
    const root = mkdtempSync(join(tmpdir(), 'db-new-'));
    dirs.push(root);
    mkdirSync(join(root, 'supabase'));

    expect(await runWithOpenStdin(root)).toBe(0);

    const [migration] = readdirSync(join(root, 'supabase/migrations'));
    expect(migration).toMatch(/^\d{14}_essai_stdin\.sql$/);
    expect(readdirSync(join(root, 'supabase/rollbacks'))).toEqual([
      migration?.replace(/\.sql$/, '.down.sql'),
    ]);
  }, 30_000);
});
