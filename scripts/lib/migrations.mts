// Convention de réversibilité (ADR 0006) : chaque migration
// supabase/migrations/<horodatage>_<nom>.sql a son retour arrière
// supabase/rollbacks/<horodatage>_<nom>.down.sql.
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
export const migrationsDir = `${repoRoot}supabase/migrations`;
export const rollbacksDir = `${repoRoot}supabase/rollbacks`;

const migrationPattern = /^(\d{14})_([a-z0-9_]+)\.sql$/;
const rollbackSuffix = '.down.sql';

export type Migration = {
  /** Horodatage, aussi clé de supabase_migrations.schema_migrations. */
  version: string;
  /** Nom de fichier sans extension : <horodatage>_<nom>. */
  basename: string;
};

/** Nom attendu du rollback d'une migration. */
export function rollbackFileName(migration: Migration): string {
  return `${migration.basename}${rollbackSuffix}`;
}

export function parseMigrationFile(file: string): Migration | undefined {
  const match = migrationPattern.exec(file);
  if (!match?.[1]) return undefined;
  return { version: match[1], basename: file.slice(0, -'.sql'.length) };
}

export type RollbackIssue =
  | { kind: 'missing-rollback'; migration: string; expected: string }
  | { kind: 'orphan-rollback'; rollback: string }
  | { kind: 'invalid-migration-name'; migration: string };

/**
 * Compare les fichiers de migrations et de rollbacks (noms seuls, triés ou
 * non). Fonction pure, testée sans accès disque.
 */
export function checkRollbacks(
  migrationFiles: readonly string[],
  rollbackFiles: readonly string[],
): RollbackIssue[] {
  const issues: RollbackIssue[] = [];
  const rollbacks = new Set(rollbackFiles.filter((f) => f.endsWith('.sql')));
  const expected = new Set<string>();

  for (const file of [...migrationFiles].sort()) {
    if (!file.endsWith('.sql')) continue;
    const migration = parseMigrationFile(file);
    if (!migration) {
      issues.push({ kind: 'invalid-migration-name', migration: file });
      continue;
    }
    const rollback = rollbackFileName(migration);
    expected.add(rollback);
    if (!rollbacks.has(rollback)) {
      issues.push({
        kind: 'missing-rollback',
        migration: file,
        expected: rollback,
      });
    }
  }
  for (const rollback of [...rollbacks].sort()) {
    if (!expected.has(rollback))
      issues.push({ kind: 'orphan-rollback', rollback });
  }
  return issues;
}

export function formatRollbackIssue(issue: RollbackIssue): string {
  switch (issue.kind) {
    case 'missing-rollback':
      return `rollback manquant pour ${issue.migration} : créer supabase/rollbacks/${issue.expected}`;
    case 'orphan-rollback':
      return `rollback sans migration : supabase/rollbacks/${issue.rollback}`;
    case 'invalid-migration-name':
      return `nom de migration invalide (attendu <horodatage>_<nom_snake_case>.sql) : ${issue.migration}`;
  }
}

function listSql(dir: string): string[] {
  try {
    return readdirSync(dir).filter((f) => f.endsWith('.sql'));
  } catch {
    return [];
  }
}

/** Migrations présentes sur disque, dans l'ordre d'application. */
export function listMigrations(): Migration[] {
  return listSql(migrationsDir)
    .sort()
    .map(parseMigrationFile)
    .filter((m): m is Migration => m !== undefined);
}

export function readRollbackIssues(): RollbackIssue[] {
  return checkRollbacks(listSql(migrationsDir), listSql(rollbacksDir));
}
