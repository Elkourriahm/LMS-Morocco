// Le schéma app_private n'est jamais exposé par l'API (ADR 0006). La liste
// des schémas exposés est passée à PostgREST par supabase/config.toml, hors de
// la base : pgTAP ne peut pas la vérifier, ce test le fait.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { repoRoot } from './migrations.mts';

const config = readFileSync(`${repoRoot}supabase/config.toml`, 'utf8');

/** Contenu de la section [api], jusqu'à la section suivante. */
function apiSection(): string {
  const match = /^\[api\]\s*$([\s\S]*?)(?=^\[)/m.exec(config);
  if (!match?.[1]) throw new Error('Section [api] introuvable.');
  return match[1];
}

/** Valeur d'une liste TOML de chaînes sur une ligne (`clé = ["a", "b"]`). */
function stringList(section: string, key: string): string[] {
  const match = new RegExp(`^${key}\\s*=\\s*\\[([^\\]]*)\\]`, 'm').exec(
    section,
  );
  if (!match) throw new Error(`Clé ${key} introuvable dans [api].`);
  return [...(match[1] ?? '').matchAll(/"([^"]*)"/g)].map((m) => m[1] ?? '');
}

describe('supabase/config.toml, section [api]', () => {
  it('expose uniquement public et graphql_public', () => {
    expect(stringList(apiSection(), 'schemas')).toEqual([
      'public',
      'graphql_public',
    ]);
  });

  it("n'ajoute pas app_private au search_path des requêtes", () => {
    expect(stringList(apiSection(), 'extra_search_path')).not.toContain(
      'app_private',
    );
  });
});
