import { describe, expect, it } from 'vitest';
import { envSchema, findExposedServiceRoleKeys, parseServerEnv } from './env';

// Valeurs fictives, sans rapport avec de vraies clés.
const publicVars = {
  APP_ENV: 'test',
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'cle-anon-fictive',
  NEXT_PUBLIC_SITE_URL: 'http://127.0.0.1:3000',
};
const serverVars = {
  ...publicVars,
  SUPABASE_SERVICE_ROLE_KEY: 'cle-service-fictive',
};

describe('envSchema (variables publiques)', () => {
  it('rejette un APP_ENV manquant', () => {
    expect(() => envSchema.parse({})).toThrow();
  });

  it('accepte un environnement valide et fournit le nom par défaut', () => {
    expect(envSchema.parse(publicVars)).toEqual({
      ...publicVars,
      NEXT_PUBLIC_APP_NAME: 'LMS Maroc',
    });
  });

  it('rejette une URL Supabase invalide', () => {
    expect(() =>
      envSchema.parse({
        ...publicVars,
        NEXT_PUBLIC_SUPABASE_URL: 'pas une url',
      }),
    ).toThrow();
  });

  it('rejette une origine du site avec « / » final', () => {
    expect(() =>
      envSchema.parse({
        ...publicVars,
        NEXT_PUBLIC_SITE_URL: 'http://127.0.0.1:3000/',
      }),
    ).toThrow();
  });

  it('ne contient pas la clé service_role', () => {
    expect(envSchema.parse(serverVars)).not.toHaveProperty(
      'SUPABASE_SERVICE_ROLE_KEY',
    );
  });
});

describe('parseServerEnv (variables serveur)', () => {
  it('accepte la clé service_role sans préfixe public', () => {
    expect(parseServerEnv(serverVars).SUPABASE_SERVICE_ROLE_KEY).toBe(
      'cle-service-fictive',
    );
  });

  it('rejette une clé service_role absente côté serveur', () => {
    expect(() => parseServerEnv(publicVars)).toThrow(
      /SUPABASE_SERVICE_ROLE_KEY/,
    );
  });

  it('rejette une clé service_role préfixée NEXT_PUBLIC_', () => {
    expect(() =>
      parseServerEnv({
        ...publicVars,
        NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY: 'cle-service-fictive',
      }),
    ).toThrow(/NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY/);
  });

  it('rejette la valeur service_role copiée sous un autre nom public', () => {
    expect(() =>
      parseServerEnv({
        ...serverVars,
        NEXT_PUBLIC_ADMIN_KEY: 'cle-service-fictive',
      }),
    ).toThrow(/NEXT_PUBLIC_ADMIN_KEY/);
  });

  it('rejette une clé service_role identique à la clé anon', () => {
    expect(() =>
      parseServerEnv({
        ...publicVars,
        SUPABASE_SERVICE_ROLE_KEY: 'cle-anon-fictive',
      }),
    ).toThrow();
  });
});

describe('findExposedServiceRoleKeys', () => {
  it('ne signale rien pour une configuration correcte', () => {
    expect(findExposedServiceRoleKeys(serverVars)).toEqual([]);
  });
});
