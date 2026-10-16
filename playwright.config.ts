import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Prérequis : Supabase local démarré (pnpm db:start) et pnpm db:seed-dev.
  // Build de production plutôt que `next dev` : sous requêtes parallèles, le
  // serveur de développement échoue par intermittence (« Unexpected end of
  // JSON input » en générant les routes), sans rapport avec l'application.
  webServer: {
    command:
      'pnpm exec next build && pnpm exec next start --hostname 127.0.0.1',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});
