// `pnpm db:rollback-check` (ADR 0006), sur la base locale (Docker) :
//   1. base sans aucune migration → instantané du schéma (référence vide) ;
//   2. toutes les migrations → instantané « complet » ;
//   3. tous les rollbacks, du plus récent au plus ancien → le schéma doit
//      redevenir identique à la référence vide ;
//   4. toutes les migrations à nouveau → identique à l'instantané complet.
// S'arrête au premier échec. Détruit les données de la base locale.
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  listMigrations,
  rollbackFileName,
  rollbacksDir,
  readRollbackIssues,
  formatRollbackIssue,
} from './lib/migrations.mts';
import { psql, supabase } from './lib/supabase.mts';

const workDir = mkdtempSync(join(tmpdir(), 'db-rollback-check-'));

function step(message: string): void {
  console.log(`\ndb:rollback-check : ${message}`);
}

/** Schéma des bases applicatives (pg_dump, hors schémas gérés par Supabase). */
function snapshot(label: string): string {
  const file = join(workDir, `${label}.sql`);
  supabase(['db', 'dump', '--local', '--file', file]);
  return readFileSync(file, 'utf8');
}

function firstDifference(expected: string, actual: string): string {
  const a = expected.split('\n');
  const b = actual.split('\n');
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] !== b[i]) {
      return `ligne ${i + 1}\n  attendu : ${a[i] ?? '(fin)'}\n  obtenu  : ${b[i] ?? '(fin)'}`;
    }
  }
  return '(aucune)';
}

function assertSame(expected: string, actual: string, what: string): void {
  if (expected !== actual) {
    throw new Error(
      `${what} : le schéma diffère.\nPremière différence, ${firstDifference(expected, actual)}\nInstantanés conservés dans ${workDir}`,
    );
  }
}

function main(): void {
  const issues = readRollbackIssues();
  if (issues.length > 0) {
    throw new Error(issues.map(formatRollbackIssue).join('\n'));
  }
  const migrations = listMigrations();
  if (migrations.length === 0) {
    console.log('db:rollback-check : aucune migration, rien à vérifier.');
    return;
  }

  step(`base vide (reset sans les ${migrations.length} migration(s))`);
  supabase([
    'db',
    'reset',
    '--local',
    '--no-seed',
    '--last',
    String(migrations.length),
  ]);
  const empty = snapshot('0-vide');

  step('application de toutes les migrations');
  supabase(['migration', 'up', '--local']);
  const full = snapshot('1-complet');

  for (const migration of [...migrations].reverse()) {
    step(`rollback ${rollbackFileName(migration)}`);
    // Le rollback et l'effacement de son entrée d'historique, dans la même
    // transaction : la migration redevient « en attente » pour l'étape 4.
    psql(
      readFileSync(`${rollbacksDir}/${rollbackFileName(migration)}`, 'utf8') +
        `\ndelete from supabase_migrations.schema_migrations where version = '${migration.version}';\n`,
    );
  }
  assertSame(empty, snapshot('2-apres-rollbacks'), 'Après tous les rollbacks');

  step('nouvelle application de toutes les migrations');
  supabase(['migration', 'up', '--local']);
  assertSame(full, snapshot('3-reapplique'), 'Après réapplication');

  rmSync(workDir, { recursive: true, force: true });
  console.log(
    `\ndb:rollback-check : ${migrations.length} migration(s) appliquée(s), annulée(s) et réappliquée(s) sans écart.`,
  );
}

try {
  main();
} catch (error) {
  console.error(
    `\ndb:rollback-check : ÉCHEC\n${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
}
