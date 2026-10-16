import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { defineConfig } from 'vitest/config';

const envFile = fileURLToPath(new URL('./.env.local', import.meta.url));
const localEnv = existsSync(envFile)
  ? parseEnv(readFileSync(envFile, 'utf8'))
  : {};

// Tests d'intégration (`pnpm test:integration`) : Supabase local démarré
// (`pnpm db:start`). Variables lues dans .env.local, comme l'application.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Module serveur importé hors de Next.js : server-only est sans objet.
      'server-only': fileURLToPath(
        new URL('./node_modules/server-only/empty.js', import.meta.url),
      ),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.int.test.ts', 'scripts/**/*.int.test.ts'],
    // Variables déjà définies (CI) prioritaires sur .env.local.
    env: { ...localEnv, ...process.env } as Record<string, string>,
    testTimeout: 60_000,
    // Tests qui partagent la base locale : pas de parallélisme entre fichiers.
    fileParallelism: false,
  },
});
