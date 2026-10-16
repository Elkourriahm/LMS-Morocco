import { describe, expect, it } from 'vitest';
import {
  SEED_PASSWORD,
  SeedRefusedError,
  assertLocalSupabaseUrl,
  seedUsers,
} from './seed-dev.mts';

describe('assertLocalSupabaseUrl', () => {
  it.each([
    'http://127.0.0.1:54321',
    'http://localhost:54321',
    'http://[::1]:54321',
  ])('accepte %s', (url) => {
    expect(assertLocalSupabaseUrl(url).href).toBe(new URL(url).href);
  });

  it.each([
    'https://abcdefghijklmnop.supabase.co',
    'http://127.0.0.1.exemple.test:54321',
    'http://localhost.exemple.test',
    'http://10.0.0.5:54321',
    'pas une url',
    undefined,
  ])('refuse %s', (url) => {
    expect(() => assertLocalSupabaseUrl(url)).toThrow(SeedRefusedError);
  });
});

describe('jeu de données', () => {
  it('respecte la longueur minimale des mots de passe (10)', () => {
    expect(SEED_PASSWORD.length).toBeGreaterThanOrEqual(10);
  });

  it('n’utilise que des adresses fictives en .test', () => {
    for (const user of seedUsers) expect(user.email).toMatch(/@exemple\.test$/);
  });
});
