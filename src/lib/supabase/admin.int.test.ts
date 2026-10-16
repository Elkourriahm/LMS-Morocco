// Trigger d'inscription (ADR 0007) de bout en bout : utilisateur créé par
// l'API admin, donc inséré dans auth.users par GoTrue (supabase_auth_admin),
// cas que pgTAP ne peut pas simuler. Supabase local requis.
import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { createAdminClient } from './admin';

const admin = createAdminClient();
const created: string[] = [];

afterEach(async () => {
  for (const id of created.splice(0)) await admin.auth.admin.deleteUser(id);
});

describe('trigger d’inscription', () => {
  it('crée la ligne profiles d’un utilisateur créé par GoTrue', async () => {
    const { data, error } = await admin.auth.admin.createUser({
      email: `integration-${randomUUID()}@exemple.test`,
      password: 'Integration-Fictif-1',
      email_confirm: true,
      user_metadata: {
        full_name: 'Utilisateur fictif',
        preferred_locale: 'ar',
      },
    });
    expect(error).toBeNull();
    const id = data.user?.id;
    if (!id) throw new Error('Utilisateur non créé.');
    created.push(id);

    const profile = await admin
      .from('profiles')
      .select('id, full_name, preferred_locale')
      .eq('id', id)
      .single();
    expect(profile.error).toBeNull();
    expect(profile.data).toEqual({
      id,
      full_name: 'Utilisateur fictif',
      preferred_locale: 'ar',
    });
  });

  it('supprimer l’utilisateur supprime son profil', async () => {
    const { data } = await admin.auth.admin.createUser({
      email: `integration-${randomUUID()}@exemple.test`,
      password: 'Integration-Fictif-1',
      email_confirm: true,
    });
    const id = data.user?.id;
    if (!id) throw new Error('Utilisateur non créé.');
    await admin.auth.admin.deleteUser(id);

    const profile = await admin.from('profiles').select('id').eq('id', id);
    expect(profile.data).toEqual([]);
  });
});
