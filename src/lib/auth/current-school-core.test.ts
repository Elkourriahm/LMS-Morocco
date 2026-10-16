import { describe, expect, it, vi } from 'vitest';
import {
  type CurrentSchoolDeps,
  type MembershipRow,
  groupStaffSchools,
  loadCurrentSchool,
} from './current-school-core';

// Données fictives.
const A = { id: '5c000000-0000-4000-8000-00000000000a', name: 'École A' };
const B = { id: '5c000000-0000-4000-8000-00000000000b', name: 'Centre B' };
const USER = '7e000000-0000-4000-8000-000000000001';

function deps(
  rows: MembershipRow[],
  cookie?: string,
  userId: string | null = USER,
): CurrentSchoolDeps {
  return {
    getUserId: vi.fn(async () => userId),
    listMemberships: vi.fn(async () => rows),
    readSchoolCookie: vi.fn(async () => cookie),
  };
}

describe('loadCurrentSchool', () => {
  it('sans utilisateur : unauthenticated, sans lire les appartenances', async () => {
    const d = deps([], undefined, null);
    expect(await loadCurrentSchool(d)).toEqual({ status: 'unauthenticated' });
    expect(d.listMemberships).not.toHaveBeenCalled();
  });

  it('0 établissement : pas d’accès', async () => {
    expect(await loadCurrentSchool(deps([]))).toEqual({
      status: 'no-staff-access',
      parentOnly: false,
    });
  });

  it('parent seulement : pas d’accès, avec parentOnly', async () => {
    expect(
      await loadCurrentSchool(deps([{ role: 'parent', school: A }])),
    ).toEqual({ status: 'no-staff-access', parentOnly: true });
  });

  it('1 établissement sans cookie : sélection automatique', async () => {
    const result = await loadCurrentSchool(
      deps([
        { role: 'direction', school: A },
        { role: 'caisse', school: A },
      ]),
    );
    expect(result).toMatchObject({
      status: 'ok',
      school: A,
      roles: ['direction', 'caisse'],
    });
  });

  it('le rôle parent ne donne pas accès, même cumulé', async () => {
    const result = await loadCurrentSchool(
      deps([
        { role: 'parent', school: A },
        { role: 'enseignant', school: B },
      ]),
    );
    expect(result).toMatchObject({
      status: 'ok',
      school: B,
      roles: ['enseignant'],
    });
  });

  it('plusieurs établissements sans cookie : choix', async () => {
    expect(
      await loadCurrentSchool(
        deps([
          { role: 'enseignant', school: A },
          { role: 'direction', school: B },
        ]),
      ),
    ).toEqual({ status: 'choose-school' });
  });

  it('plusieurs établissements avec un cookie valide : celui-ci', async () => {
    const result = await loadCurrentSchool(
      deps(
        [
          { role: 'enseignant', school: A },
          { role: 'direction', school: B },
        ],
        B.id,
      ),
    );
    expect(result).toMatchObject({
      status: 'ok',
      school: B,
      roles: ['direction'],
    });
    expect(result.status === 'ok' && result.schools).toHaveLength(2);
  });

  it('cookie vers un établissement dont l’utilisateur n’est pas membre : invalide', async () => {
    expect(
      await loadCurrentSchool(deps([{ role: 'direction', school: A }], B.id)),
    ).toEqual({ status: 'invalid-cookie' });
  });

  it('cookie vers un établissement où l’utilisateur n’est que parent : invalide', async () => {
    expect(
      await loadCurrentSchool(
        deps(
          [
            { role: 'direction', school: A },
            { role: 'parent', school: B },
          ],
          B.id,
        ),
      ),
    ).toEqual({ status: 'invalid-cookie' });
  });

  it.each(['pas-un-uuid', '', "' or 1=1 --"])(
    'cookie falsifié (%j) : invalide',
    async (cookie) => {
      expect(
        await loadCurrentSchool(
          deps([{ role: 'direction', school: A }], cookie),
        ),
      ).toEqual({ status: 'invalid-cookie' });
    },
  );

  it('ignore une appartenance sans établissement lisible', async () => {
    expect(
      await loadCurrentSchool(deps([{ role: 'direction', school: null }])),
    ).toEqual({ status: 'no-staff-access', parentOnly: false });
  });
});

describe('groupStaffSchools', () => {
  it('regroupe par établissement, trie par nom et rôles dans l’ordre', () => {
    expect(
      groupStaffSchools([
        { role: 'caisse', school: A },
        { role: 'enseignant', school: B },
        { role: 'direction', school: A },
        { role: 'direction', school: A },
      ]),
    ).toEqual([
      { ...B, roles: ['enseignant'] },
      { ...A, roles: ['direction', 'caisse'] },
    ]);
  });
});
