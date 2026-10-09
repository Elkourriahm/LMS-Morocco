import { z } from 'zod';

// Seul point d'accès aux variables d'environnement (CLAUDE.md).
//
// - `env` : variables publiques, utilisables partout, y compris dans le
//   navigateur. Next.js n'inline dans le bundle client que les références
//   littérales `process.env.NEXT_PUBLIC_*` : chaque variable est donc lue
//   explicitement ci-dessous.
// - `getServerEnv()` : variables secrètes, côté serveur uniquement.

export const envSchema = z.object({
  APP_ENV: z.enum(['development', 'test', 'production']),
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default('LMS Maroc'),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export const serverEnvSchema = envSchema
  .extend({
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  })
  .superRefine((value, ctx) => {
    if (
      value.SUPABASE_SERVICE_ROLE_KEY === value.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['SUPABASE_SERVICE_ROLE_KEY'],
        message: 'La clé service_role ne doit pas être la clé anon.',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

type Source = Record<string, string | undefined>;

/**
 * Refuse toute variable publique (NEXT_PUBLIC_*) qui exposerait la clé
 * service_role : par son nom, ou par sa valeur sous un autre nom.
 */
export function findExposedServiceRoleKeys(source: Source): string[] {
  const secret = source.SUPABASE_SERVICE_ROLE_KEY;
  return Object.entries(source)
    .filter(
      ([name, value]) =>
        name.startsWith('NEXT_PUBLIC_') &&
        (/SERVICE_ROLE|SECRET/.test(name) ||
          (secret !== undefined && secret !== '' && value === secret)),
    )
    .map(([name]) => name);
}

export function parseServerEnv(source: Source): ServerEnv {
  const exposed = findExposedServiceRoleKeys(source);
  if (exposed.length > 0) {
    throw new Error(
      `Clé service_role exposée dans une variable publique : ${exposed.join(', ')}. ` +
        'Utiliser SUPABASE_SERVICE_ROLE_KEY, sans préfixe NEXT_PUBLIC_.',
    );
  }
  return serverEnvSchema.parse({
    ...source,
    APP_ENV: source.APP_ENV ?? source.NODE_ENV,
  });
}

export const env: Env = envSchema.parse({
  APP_ENV: process.env.APP_ENV ?? process.env.NODE_ENV,
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

let serverEnv: ServerEnv | undefined;

/** Variables serveur, validées au premier appel. Interdit dans le navigateur. */
export function getServerEnv(): ServerEnv {
  if (typeof window !== 'undefined') {
    throw new Error(
      'getServerEnv() ne doit jamais être appelé côté navigateur.',
    );
  }
  serverEnv ??= parseServerEnv(process.env);
  return serverEnv;
}
