// Vérifie que messages/fr.json et messages/ar.json ont exactement les mêmes
// clés et qu'aucune valeur n'est vide. Lancé par `pnpm i18n:check` (et donc
// par `pnpm lint`). Exécuté directement par Node (suppression des types).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export type Messages = { [key: string]: unknown };

export type CheckIssue =
  | { kind: 'missing'; key: string; missingIn: string }
  | { kind: 'empty'; key: string; file: string }
  | { kind: 'invalid'; key: string; file: string };

/** Aplatit un objet de messages en `clé.imbriquée` → valeur. */
function flatten(messages: Messages, prefix = ''): Map<string, unknown> {
  const entries = new Map<string, unknown>();
  for (const [key, value] of Object.entries(messages)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      for (const [nested, nestedValue] of flatten(value as Messages, path)) {
        entries.set(nested, nestedValue);
      }
    } else {
      entries.set(path, value);
    }
  }
  return entries;
}

export function checkMessages(
  catalogs: Record<string, Messages>,
): CheckIssue[] {
  const issues: CheckIssue[] = [];
  const flat = Object.entries(catalogs).map(
    ([file, messages]) => [file, flatten(messages)] as const,
  );
  const allKeys = new Set(flat.flatMap(([, entries]) => [...entries.keys()]));

  for (const key of [...allKeys].sort()) {
    for (const [file, entries] of flat) {
      if (!entries.has(key)) {
        issues.push({ kind: 'missing', key, missingIn: file });
        continue;
      }
      const value = entries.get(key);
      if (typeof value !== 'string') {
        issues.push({ kind: 'invalid', key, file });
      } else if (value.trim() === '') {
        issues.push({ kind: 'empty', key, file });
      }
    }
  }
  return issues;
}

export function formatIssue(issue: CheckIssue): string {
  switch (issue.kind) {
    case 'missing':
      return `clé manquante dans ${issue.missingIn} : ${issue.key}`;
    case 'empty':
      return `valeur vide dans ${issue.file} : ${issue.key}`;
    case 'invalid':
      return `valeur non textuelle dans ${issue.file} : ${issue.key}`;
  }
}

function main(): void {
  const files = ['messages/fr.json', 'messages/ar.json'];
  const root = fileURLToPath(new URL('..', import.meta.url));
  const catalogs = Object.fromEntries(
    files.map((file) => [
      file,
      JSON.parse(readFileSync(`${root}${file}`, 'utf8')) as Messages,
    ]),
  );
  const issues = checkMessages(catalogs);
  if (issues.length > 0) {
    for (const issue of issues)
      console.error(`i18n:check : ${formatIssue(issue)}`);
    process.exitCode = 1;
    return;
  }
  console.log(`i18n:check : ${files.join(' et ')} alignés.`);
}

if (import.meta.main) main();
