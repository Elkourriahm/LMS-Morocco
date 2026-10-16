// Création d'une migration et de son rollback (ADR 0006), utilisée par
// scripts/db-new.mts. Le dossier racine est paramétrable pour les tests.
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import {
  parseMigrationFile,
  repoRoot,
  rollbackFileName,
  type Migration,
} from './migrations.mts';
import { supabase } from './supabase.mts';

export const migrationNamePattern = /^[a-z][a-z0-9_]*$/;

export class DbNewError extends Error {}

/**
 * Crée supabase/migrations/<horodatage>_<nom>.sql (supabase migration new)
 * puis supabase/rollbacks/<horodatage>_<nom>.down.sql, sous `root`.
 */
export function createMigration(name: string, root = repoRoot): Migration {
  if (!migrationNamePattern.test(name)) {
    throw new DbNewError(`Nom de migration invalide : ${name}`);
  }
  const migrationsDir = `${root}/supabase/migrations`;
  const rollbacksDir = `${root}/supabase/rollbacks`;
  const list = () =>
    existsSync(migrationsDir) ? readdirSync(migrationsDir) : [];

  const before = new Set(list());
  supabase(['migration', 'new', name], { workdir: root });
  const created = list().filter((file) => !before.has(file));
  const migration =
    created.length === 1 ? parseMigrationFile(created[0] ?? '') : undefined;
  if (!migration) {
    throw new DbNewError(
      `Migration créée introuvable (${created.join(', ') || 'aucune'}).`,
    );
  }

  mkdirSync(rollbacksDir, { recursive: true });
  writeFileSync(
    `${rollbacksDir}/${rollbackFileName(migration)}`,
    `-- Rollback de supabase/migrations/${migration.basename}.sql
-- Annule exactement la migration, dans l'ordre inverse de ses instructions.
-- Vérifié par \`pnpm db:rollback-check\` (ADR 0006).
`,
    { flag: 'wx' },
  );
  return migration;
}
