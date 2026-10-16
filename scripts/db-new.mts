// `pnpm db:new <nom>` : crée la migration (supabase migration new) et son
// fichier de rollback vide, à remplir avant de commiter (ADR 0006).
import { createMigration, migrationNamePattern } from './lib/db-new.mts';
import { rollbackFileName } from './lib/migrations.mts';

const name = process.argv[2];
if (!name || !migrationNamePattern.test(name) || process.argv.length > 3) {
  console.error('Usage : pnpm db:new <nom_en_snake_case>');
  process.exit(1);
}

const migration = createMigration(name);
console.log(`db:new : supabase/migrations/${migration.basename}.sql`);
console.log(`db:new : supabase/rollbacks/${rollbackFileName(migration)}`);
