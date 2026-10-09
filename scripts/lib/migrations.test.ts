import { describe, expect, it } from 'vitest';
import { checkRollbacks, parseMigrationFile } from './migrations.mts';

describe('checkRollbacks', () => {
  it('accepte des migrations qui ont toutes leur rollback', () => {
    expect(
      checkRollbacks(
        ['20261009120000_app_private.sql', '20261010080000_schools.sql'],
        [
          '20261009120000_app_private.down.sql',
          '20261010080000_schools.down.sql',
        ],
      ),
    ).toEqual([]);
  });

  it('détecte un rollback manquant', () => {
    expect(
      checkRollbacks(
        ['20261009120000_app_private.sql', '20261010080000_schools.sql'],
        ['20261009120000_app_private.down.sql'],
      ),
    ).toEqual([
      {
        kind: 'missing-rollback',
        migration: '20261010080000_schools.sql',
        expected: '20261010080000_schools.down.sql',
      },
    ]);
  });

  it('détecte un rollback dont la migration n’existe pas', () => {
    expect(checkRollbacks([], ['20261009120000_app_private.down.sql'])).toEqual(
      [
        {
          kind: 'orphan-rollback',
          rollback: '20261009120000_app_private.down.sql',
        },
      ],
    );
  });

  it('refuse un nom de migration hors convention', () => {
    expect(checkRollbacks(['init.sql'], [])).toEqual([
      { kind: 'invalid-migration-name', migration: 'init.sql' },
    ]);
  });

  it('ignore les fichiers qui ne sont pas du SQL', () => {
    expect(checkRollbacks(['.gitkeep'], ['.gitkeep'])).toEqual([]);
  });
});

describe('parseMigrationFile', () => {
  it('extrait la version et le nom de base', () => {
    expect(parseMigrationFile('20261009120000_app_private.sql')).toEqual({
      version: '20261009120000',
      basename: '20261009120000_app_private',
    });
    expect(
      parseMigrationFile('20261009120000_App-Private.sql'),
    ).toBeUndefined();
  });
});
