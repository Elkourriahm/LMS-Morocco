import { readdir, readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const sourceRoot = 'src';
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.css']);
const forbiddenClass =
  /(?:^|[\s"'`])!?-?(?:ml|mr|pl|pr|left|right)-[^\s"'`]+|(?:^|[\s"'`])!?text-(?:left|right)(?:\/[^\s"'`]+)?(?=$|[\s"'`])/g;
const violations = [];

async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await visit(path);
    } else if (sourceExtensions.has(extname(entry.name))) {
      const content = await readFile(path, 'utf8');
      for (const match of content.matchAll(forbiddenClass)) {
        violations.push(
          `${path}: forbidden directional class ${match[0].trim()}`,
        );
      }
    }
  }
}

try {
  await visit(sourceRoot);
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

if (violations.length > 0) {
  console.error(violations.join('\n'));
  process.exitCode = 1;
} else {
  console.log('No physical-direction Tailwind classes found.');
}
