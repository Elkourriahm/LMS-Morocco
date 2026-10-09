// `pnpm db:types` : régénère src/lib/supabase/database.types.ts depuis la
// base locale, formaté par Prettier pour que la CI puisse comparer.
import { writeFileSync } from 'node:fs';
import { format, resolveConfig } from 'prettier';
import { repoRoot } from './lib/migrations.mts';
import { supabase } from './lib/supabase.mts';

const target = `${repoRoot}src/lib/supabase/database.types.ts`;
const generated = supabase(
  ['gen', 'types', '--local', '--lang', 'typescript'],
  {
    capture: true,
  },
);
const header = `// Fichier généré par \`pnpm db:types\` : ne pas modifier à la main.\n`;
const options = (await resolveConfig(target)) ?? {};
writeFileSync(
  target,
  await format(header + generated, { ...options, filepath: target }),
);
console.log('db:types : src/lib/supabase/database.types.ts régénéré.');
