import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { findSecretInFiles, listFiles } from './check-client-bundle.mts';

const dir = mkdtempSync(join(tmpdir(), 'check-bundle-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe('contrôle du bundle client', () => {
  it('trouve un fichier qui contient le secret, même imbriqué', () => {
    mkdirSync(join(dir, 'chunks'));
    writeFileSync(join(dir, 'chunks', 'a.js'), 'const k="secret-fictif-123";');
    writeFileSync(join(dir, 'b.js'), 'const k="autre";');

    const files = listFiles(dir);
    expect(files).toHaveLength(2);
    expect(findSecretInFiles(files, 'secret-fictif-123')).toEqual([
      join(dir, 'chunks', 'a.js'),
    ]);
    expect(findSecretInFiles(files, 'absent')).toEqual([]);
  });
});
