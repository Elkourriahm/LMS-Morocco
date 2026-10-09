// `pnpm db:new <nom>` : crée la migration (supabase migration new) et son
// fichier de rollback vide, à remplir avant de commiter (ADR 0006).
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import {
  migrationsDir,
  parseMigrationFile,
  rollbackFileName,
  rollbacksDir,
} from './lib/migrations.mts';
import { supabase } from './lib/supabase.mts';

const name = process.argv[2];
if (!name || !/^[a-z][a-z0-9_]*$/.test(name) || process.argv.length > 3) {
  console.error('Usage : pnpm db:new <nom_en_snake_case>');
  process.exit(1);
}

const list = () =>
  existsSync(migrationsDir) ? readdirSync(migrationsDir) : [];
const before = new Set(list());
supabase(['migration', 'new', name]);
const created = list().filter((file) => !before.has(file));
const migration =
  created.length === 1 ? parseMigrationFile(created[0] ?? '') : undefined;
if (!migration) {
  console.error(
    `db:new : migration créée introuvable (${created.join(', ') || 'aucune'}).`,
  );
  process.exit(1);
}

mkdirSync(rollbacksDir, { recursive: true });
const rollback = `${rollbacksDir}/${rollbackFileName(migration)}`;
writeFileSync(
  rollback,
  `-- Rollback de supabase/migrations/${migration.basename}.sql
-- Annule exactement la migration, dans l'ordre inverse de ses instructions.
-- Vérifié par \`pnpm db:rollback-check\` (ADR 0006).
`,
  { flag: 'wx' },
);
console.log(`db:new : supabase/migrations/${migration.basename}.sql`);
console.log(`db:new : supabase/rollbacks/${rollbackFileName(migration)}`);
