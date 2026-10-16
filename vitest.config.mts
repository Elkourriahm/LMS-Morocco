import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Même alias que tsconfig.json.
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts', '*.test.ts'],
    // Tests d'intégration (Supabase local requis) : vitest.integration.config.mts.
    exclude: ['**/node_modules/**', '**/*.int.test.ts'],
    // Valeurs fictives : src/env.ts valide les variables publiques au chargement.
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'cle-anon-de-test',
      NEXT_PUBLIC_SITE_URL: 'http://127.0.0.1:3000',
    },
  },
});
