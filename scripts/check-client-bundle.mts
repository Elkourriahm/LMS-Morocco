// Après `next build` : échoue si la valeur de SUPABASE_SERVICE_ROLE_KEY
// apparaît dans les fichiers envoyés au navigateur (.next/static).
// Lancé par `pnpm build` (ADR 0006).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadEnvFile } from 'node:process';
import { repoRoot } from './lib/migrations.mts';

/** Fichiers d'un répertoire, récursivement. */
export function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  });
}

/** Fichiers dont le contenu contient le secret. */
export function findSecretInFiles(files: string[], secret: string): string[] {
  const needle = Buffer.from(secret);
  return files.filter((file) => readFileSync(file).includes(needle));
}

function main(): void {
  // Même ordre de priorité que Next.js : l'environnement, puis .env.local, .env.
  for (const file of ['.env.local', '.env']) {
    if (existsSync(join(repoRoot, file))) loadEnvFile(join(repoRoot, file));
  }
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY absente : contrôle impossible.');
  }
  const staticDir = join(repoRoot, '.next', 'static');
  if (!existsSync(staticDir)) {
    throw new Error('.next/static introuvable : lancer `next build` avant.');
  }
  const files = listFiles(staticDir);
  const leaks = findSecretInFiles(files, secret);
  if (leaks.length > 0) {
    throw new Error(
      `clé service_role trouvée dans le bundle client :\n${leaks.join('\n')}`,
    );
  }
  console.log(
    `check:bundle : clé service_role absente des ${files.length} fichiers de .next/static.`,
  );
}

if (import.meta.main) {
  try {
    main();
  } catch (error) {
    console.error(
      `check:bundle : ÉCHEC, ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  }
}
