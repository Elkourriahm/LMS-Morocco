// Résolution de l'alias `@/` (tsconfig.json) pour les scripts Node qui
// importent du code de src/ (pnpm db:seed-dev) : `@/x` devient src/x.ts,
// src/x.tsx ou src/x/index.ts. Chargé par `node --import`.
import { existsSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';
import { repoRoot } from './migrations.mts';

const extensions = ['.ts', '.tsx', '/index.ts'];

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      const base = `${repoRoot}src/${specifier.slice(2)}`;
      const file = extensions
        .map((extension) => `${base}${extension}`)
        .find((candidate) => existsSync(candidate));
      if (file) return nextResolve(pathToFileURL(file).href, context);
    }
    return nextResolve(specifier, context);
  },
});
