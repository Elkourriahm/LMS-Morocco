// Données de développement FICTIVES (ADR 0003, 0008), créées par
// `pnpm db:seed-dev` via l'API admin (service_role). Idempotent : relancer
// le script remet les comptes et appartenances dans l'état décrit ici.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../src/lib/supabase/database.types.ts';

export class SeedRefusedError extends Error {}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/** Refuse toute URL Supabase qui n'est pas locale (localhost, 127.0.0.1). */
export function assertLocalSupabaseUrl(value: string | undefined): URL {
  let url: URL;
  try {
    url = new URL(value ?? '');
  } catch {
    throw new SeedRefusedError(`URL Supabase invalide : ${value ?? '(vide)'}.`);
  }
  if (!LOCAL_HOSTS.has(url.hostname)) {
    throw new SeedRefusedError(
      `Refusé : ${url.hostname} n'est pas une base Supabase locale (localhost ou 127.0.0.1).`,
    );
  }
  return url;
}

/** Mot de passe commun des comptes fictifs, documenté dans le README. */
export const SEED_PASSWORD = 'Demo-Local-2026!';

export const seedSchools = [
  {
    key: 'A',
    id: '5c000000-0000-4000-8000-00000000000a',
    name: 'École Les Orangers (fictive)',
    type: 'ecole',
  },
  {
    key: 'B',
    id: '5c000000-0000-4000-8000-00000000000b',
    name: 'Centre de soutien Atlas (fictif)',
    type: 'centre',
  },
] as const;

type AppRole = Database['public']['Enums']['app_role'];
type SchoolKey = (typeof seedSchools)[number]['key'];

export const seedUsers: {
  email: string;
  fullName: string;
  locale: 'fr' | 'ar';
  memberships: { school: SchoolKey; role: AppRole }[];
}[] = [
  {
    email: 'direction@exemple.test',
    fullName: 'Direction fictive',
    locale: 'fr',
    memberships: [{ school: 'A', role: 'direction' }],
  },
  {
    email: 'caisse@exemple.test',
    fullName: 'Caisse fictive',
    locale: 'fr',
    memberships: [{ school: 'A', role: 'caisse' }],
  },
  {
    email: 'enseignant@exemple.test',
    fullName: 'Enseignant fictif',
    locale: 'ar',
    memberships: [{ school: 'A', role: 'enseignant' }],
  },
  {
    email: 'multi@exemple.test',
    fullName: 'Membre de deux établissements',
    locale: 'fr',
    memberships: [
      { school: 'A', role: 'enseignant' },
      { school: 'B', role: 'direction' },
    ],
  },
  {
    email: 'parent@exemple.test',
    fullName: 'Parent fictif',
    locale: 'ar',
    memberships: [{ school: 'A', role: 'parent' }],
  },
];

type Admin = SupabaseClient<Database>;

/** Résultat supabase-js : données si succès, sinon erreur levée. */
function check<T>(
  result:
    { data: T; error: null } | { data: unknown; error: { message: string } },
  what: string,
): T {
  if (result.error) throw new Error(`${what} : ${result.error.message}`);
  return result.data;
}

async function findUserIds(admin: Admin): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (let page = 1; ; page += 1) {
    const { users } = check(
      await admin.auth.admin.listUsers({ page, perPage: 1000 }),
      'Liste des utilisateurs',
    );
    for (const user of users) if (user.email) ids.set(user.email, user.id);
    if (users.length < 1000) return ids;
  }
}

export async function seedDev(admin: Admin): Promise<void> {
  check(
    await admin.from('schools').upsert(
      seedSchools.map(({ id, name, type }) => ({ id, name, type })),
      { onConflict: 'id' },
    ),
    'Établissements',
  );

  const existing = await findUserIds(admin);
  for (const user of seedUsers) {
    const attributes = {
      password: SEED_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: user.fullName,
        preferred_locale: user.locale,
      },
    };
    let id = existing.get(user.email);
    if (id) {
      check(await admin.auth.admin.updateUserById(id, attributes), user.email);
    } else {
      id = check(
        await admin.auth.admin.createUser({ email: user.email, ...attributes }),
        user.email,
      ).user.id;
    }

    // Appartenances exactement conformes au jeu de données.
    check(
      await admin.from('memberships').delete().eq('user_id', id),
      `Appartenances de ${user.email}`,
    );
    check(
      await admin.from('memberships').insert(
        user.memberships.map(({ school, role }) => ({
          school_id: seedSchools.find((s) => s.key === school)?.id ?? '',
          user_id: id,
          role,
        })),
      ),
      `Appartenances de ${user.email}`,
    );
  }
}
