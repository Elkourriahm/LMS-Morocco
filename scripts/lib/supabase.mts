// Lance la CLI Supabase installée dans node_modules, de la même façon sous
// Windows et sous Linux (pas de shell, pas de .cmd).
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { repoRoot } from './migrations.mts';

const cliEntry = `${repoRoot}node_modules/supabase/dist/supabase.js`;

type RunOptions = {
  /** Capture la sortie standard au lieu de l'afficher. */
  capture?: boolean;
};

export class SupabaseCliError extends Error {}

export function supabase(args: string[], options: RunOptions = {}): string {
  const result = spawnSync(process.execPath, [cliEntry, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['inherit', options.capture ? 'pipe' : 'inherit', 'inherit'],
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new SupabaseCliError(
      `supabase ${args.join(' ')} a échoué (code ${result.status ?? 'inconnu'}).`,
    );
  }
  return result.stdout ?? '';
}

/** Nom du conteneur Postgres local : supabase_db_<project_id de config.toml>. */
function dbContainer(): string {
  const config = readFileSync(`${repoRoot}supabase/config.toml`, 'utf8');
  const projectId = /^project_id\s*=\s*"([^"]+)"/m.exec(config)?.[1];
  if (!projectId)
    throw new SupabaseCliError(
      'project_id introuvable dans supabase/config.toml.',
    );
  return `supabase_db_${projectId}`;
}

/**
 * Exécute un script SQL (plusieurs instructions possibles) dans la base
 * locale, via psql dans le conteneur Postgres, en une seule transaction et
 * en s'arrêtant à la première erreur. `supabase db query` n'accepte qu'une
 * instruction à la fois.
 */
export function psql(sql: string): void {
  const result = spawnSync(
    'docker',
    [
      'exec',
      '-i',
      dbContainer(),
      'psql',
      '-U',
      'postgres',
      '-d',
      'postgres',
      '-v',
      'ON_ERROR_STOP=1',
      '--single-transaction',
      '--quiet',
    ],
    { input: sql, encoding: 'utf8', stdio: ['pipe', 'inherit', 'inherit'] },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new SupabaseCliError(
      `psql a échoué (code ${result.status ?? 'inconnu'}).`,
    );
  }
}
