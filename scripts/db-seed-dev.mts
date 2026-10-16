// `pnpm db:seed-dev` : données FICTIVES pour le développement local et les
// tests e2e (ADR 0008). Refuse toute base qui n'est pas locale.
// Lancé avec `--conditions=react-server` (server-only) et
// `--import ./scripts/lib/alias-hooks.mts` (alias @/) pour réutiliser
// src/lib/supabase/admin.ts, seul point de création du client service_role.
import { existsSync } from 'node:fs';
import { repoRoot } from './lib/migrations.mts';
import {
  SeedRefusedError,
  assertLocalSupabaseUrl,
  seedDev,
  seedUsers,
} from './lib/seed-dev.mts';

// Variables déjà définies prioritaires sur .env.local (loadEnvFile ne les
// écrase pas).
for (const file of ['.env.local', '.env']) {
  if (existsSync(`${repoRoot}${file}`))
    process.loadEnvFile(`${repoRoot}${file}`);
}

// Avant tout appel réseau. process.exitCode plutôt que process.exit() : sous
// Windows, process.exit() fait ici planter libuv (code 0xC0000409).
let refused = false;
try {
  assertLocalSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
} catch (error) {
  if (!(error instanceof SeedRefusedError)) throw error;
  console.error(`db:seed-dev : ${error.message}`);
  process.exitCode = 1;
  refused = true;
}

if (!refused) {
  const { createAdminClient } = await import('@/lib/supabase/admin');
  await seedDev(createAdminClient());
  console.log(
    `db:seed-dev : 2 établissements, ${seedUsers.length} comptes fictifs (${seedUsers.map((u) => u.email).join(', ')}).`,
  );
}
